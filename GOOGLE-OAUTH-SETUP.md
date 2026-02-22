# Google OAuth Setup for Habit Garden

## Step 1: Go to Google Cloud Console
Visit https://console.cloud.google.com/ and create a new project (or select existing)

## Step 2: Enable Google Identity API
1. Go to **APIs & Services** > **Library**
2. Search for **Google Identity Services API**
3. Click **Enable**

## Step 3: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure the OAuth consent screen (if prompted):
   - User Type: **External**
   - App name: "Habit Garden"
   - User support email: your email
   - Developer contact info: your email
   - Click **Save and Continue** (skip scopes)
4. Back to Credentials, create OAuth client ID:
   - Application type: **Web application**
   - Name: "Habit Garden Dev"
   - Authorized JavaScript origins:
     - `http://localhost:3002`
   - Authorized redirect URIs:
     - `http://localhost:3002/api/auth/callback/google`
5. Click **Create**

## Step 4: Get Credentials
Copy the **Client ID** and **Client Secret** from the popup

## Step 5: Add to .env.local
Edit `.env.local` and add:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## Step 6: Restart
Restart the dev server - the auth warning should disappear.
