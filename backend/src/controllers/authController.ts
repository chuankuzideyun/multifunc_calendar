import { Request, Response } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { encrypt } from '../services/crypto';
import { AuthenticatedRequest } from '../middleware/auth';

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Redirects user to Google OAuth Concent screen.
 */
export async function redirectToGoogle(req: Request, res: Response) {
  const oauth2Client = getOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forces Google to supply the refresh token
    scope: scopes
  });

  return res.redirect(url);
}

/**
 * Handles the Google OAuth callback, processes tokens, and establishes session.
 */
export async function handleGoogleCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('OAuth authorization code missing.');
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user details from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfoRes = await oauth2.userinfo.get();
    
    const email = userInfoRes.data.email;
    const name = userInfoRes.data.name || '';

    if (!email) {
      return res.status(400).send('Could not retrieve user email from Google.');
    }

    // Encrypt the refresh token
    let googleRefreshTokenEncrypted: string | null = null;
    if (tokens.refresh_token) {
      googleRefreshTokenEncrypted = encrypt(tokens.refresh_token);
    }

    // Save or update user in database
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      user = await prisma.user.update({
        where: { email },
        data: {
          name,
          ...(googleRefreshTokenEncrypted ? { googleRefreshTokenEncrypted } : {})
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleRefreshTokenEncrypted
        }
      });
    }

    // Validate that we actually have a refresh token for this user
    if (!user.googleRefreshTokenEncrypted) {
      console.warn(`[WARNING] No refresh token found for user ${email}. Dynamic API calls will fail when access token expires.`);
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set JWT in HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect user back to React frontend
    return res.redirect(env.FRONTEND_URL);
  } catch (error) {
    console.error('[Google OAuth Callback Error]', error);
    return res.status(500).send('Authentication failed.');
  }
}

/**
 * Returns currently logged-in user profile details.
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        location: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('[GetMe Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Updates user location settings.
 */
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { location } = req.body;

  if (location === undefined) {
    return res.status(400).json({ error: 'Location field is required.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        location: location && location.trim() !== '' ? location.trim() : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        location: true
      }
    });

    return res.json({
      message: 'Settings updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('[UpdateSettings Error]', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Logs out the user by clearing the JWT session cookie.
 */
export async function logout(req: Request, res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  return res.json({ message: 'Logged out successfully.' });
}
