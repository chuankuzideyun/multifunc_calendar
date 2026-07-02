# Personal Schedule Assistant

A secure and practical personal schedule assistant Web App. Core features: automatically extract schedule items from Gmail, intelligently plan weekend running sessions based on weather, support voice event creation, and manage all schedules in a unified FullCalendar dashboard.

## Project Structure

- `/backend` - Express + TypeScript + Prisma backend service
- `/frontend` - React 18 + Vite + TypeScript + Tailwind CSS v3 frontend application

---

## Quick Start (Running Locally)

### 1. Configure Environment Variables
1. Under the root project directory, copy `.env.example` to `.env`.
2. Fill in the Database, Redis, Gemini, OpenWeatherMap, and Google OAuth credentials (see below).

### 2. Initialize Database (Supabase)
In the `backend` directory:
```bash
cd backend
npm install
# Generate Prisma Client
npx prisma generate
# Push Schema to your cloud Supabase database
npx prisma db push
```

### 3. Run Applications
In the `backend` directory to start the server:
```bash
npm run dev
```

In the `frontend` directory to start the React web app:
```bash
cd ../frontend
npm install
npm run dev
```

---

## Guide: Creating OAuth 2.0 Credentials in Google Cloud Console

Since this application needs to access your Gmail (read-only) and Google Calendar (read/write), you need to set up OAuth credentials on the Google Cloud Platform. Please follow these steps:

### 1. Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown list at the top navigation bar, then select **"New Project"**.
3. Enter a project name (e.g., `Personal Schedule Assistant`), and click **"Create"**.

### 2. Enable API Services
1. In the left-side navigation panel, select **"APIs & Services" > "Library"**.
2. Search for and enable the following two APIs:
   - **Gmail API**
   - **Google Calendar API**
3. On each API page, click **"Enable"**.

### 3. Configure OAuth Consent Screen
1. Click **"OAuth Consent Screen"** on the left navigation panel.
2. Select **"External"** (for personal Google accounts), then click **"Create"**.
3. Fill in the basic application details:
   - **App name**: e.g., `Personal Schedule Assistant`
   - **User support email**: Select your Gmail address.
   - **Developer contact information**: Fill in your email.
4. Click **"Save and Continue"**.
5. Under the **"Scopes"** step, click **"Add or remove scopes"**.
6. Check or add the following two scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (View your email messages)
   - `https://www.googleapis.com/auth/calendar` (Manage your calendars)
7. Click **"Update"**, then **"Save and Continue"**.
8. Under the **"Test Users"** step, click **"ADD USERS"**, and add the Google email addresses you plan to log in and test with. **Note: During the testing phase, only users listed in the test users list will be allowed to log into the application.**
9. Click **"Save and Continue"** to complete the configuration.

### 4. Create OAuth 2.0 Client Credentials
1. Click **"Credentials"** in the left navigation panel.
2. Click **"Create Credentials" > "OAuth client ID"** at the top.
3. Select **"Web application"** for the **Application type**.
4. **Name**: e.g., `Schedule Assistant Local`
5. **Authorized redirect URIs**:
   - Click **"ADD URI"**
   - Enter: `http://localhost:5000/api/auth/google/callback`
   - *(If deploying to production, add your production callback URL here)*
6. Click **"Create"**.
7. Copy your **Client ID** and **Client Secret** from the popup modal.
8. Paste them into the `.env` file in the root folder of this project:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   ```

---

## Deployment to Render

To deploy the backend service to Render, please follow these steps:

### 1. Register and Connect GitHub
1. Sign up/log in at [render.com](https://render.com/).
2. Connect your GitHub account and repository to Render.

### 2. Create a Web Service
1. In the Render Dashboard, click **"New" > "Web Service"**.
2. Select your connected GitHub repository.
3. In the configuration:
   - **Name**: `schedule-assistant-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Region**: `oregon` (recommended)
   - **Plan**: `Free`
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm run start`

Alternatively, you can import the configuration automatically using the `backend/render.yaml` IaC file on Render.

### 3. Configure Environment Variables
You must manually fill in all the environment variables that are set to `sync: false` in the Render Dashboard:
- `DATABASE_URL`: Fill in the Supabase **pooler connection string** (e.g. `postgresql://postgres.xxx:password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`).
  > [!IMPORTANT]
  > The connection string MUST end with `?pgbouncer=true`, otherwise prepared statement conflicts will occur in the production environment.
- `REDIS_URL`: The Redis connection string (e.g., Upstash Redis).
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret.
- `GOOGLE_REDIRECT_URI`: Set to your production redirect URI (e.g. `https://xxx.onrender.com/api/auth/google/callback`). Note: Remember to also add this URI to the Authorized redirect URIs in the Google Cloud Console.
- `GEMINI_API_KEY`: Your Gemini API key.
- `OPENWEATHERMAP_API_KEY`: Your OpenWeatherMap API key.
- `ENCRYPTION_KEY`: 32-byte (64 characters) hex string for encryption.
- `JWT_SECRET`: Secret key for signing JWT tokens.
- `NODE_ENV`: Set to `production`.

### 4. Deploy and Retrieve Service URL
1. Click **"Create Web Service"** to start the build and deployment.
2. Once the deployment finishes, copy the Service URL at the top of the page (formatted as `https://xxx.onrender.com`).

---

## Deployment to Vercel

To deploy the React + Vite frontend application to Vercel, please follow these steps:

### 1. Register and Connect GitHub
1. Sign up/log in at [vercel.com](https://vercel.com/).
2. Click **"Add New" > "Project"** and import your GitHub repository.

### 2. Configure Vercel Project
1. Set the configuration details:
   - **Root Directory**: Select `frontend`.
   - **Framework Preset**: Select `Vite`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Add Environment Variables
Add the following environment variables in the project settings before clicking deploy:
- `VITE_API_URL`: Set this to your Render backend URL (e.g. `https://xxx.onrender.com`).
- `VITE_AGENT_URL`: Set this to your agent service URL (can be a placeholder for now, e.g. `https://your-agent-service.onrender.com`).

### 4. Post-Deployment Updates
Once Vercel finishes deploying, copy your Vercel deployment domain (e.g. `https://your-app.vercel.app`) and complete the following post-deployment steps:
1. **Update Render backend environment variable**: 
   - Go to your Render backend dashboard.
   - Update the `FRONTEND_URL` environment variable to your Vercel domain: `https://your-app.vercel.app`.
2. **Update Google OAuth redirect URIs**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Under **APIs & Services > Credentials**, edit your OAuth 2.0 client ID.
   - Under **Authorized redirect URIs**, add your production callback URL pointing to the Render backend service: `https://your-backend-name.onrender.com/api/auth/google/callback`.
