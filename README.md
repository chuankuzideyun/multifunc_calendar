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
