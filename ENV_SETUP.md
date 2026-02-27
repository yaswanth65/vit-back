# Environment Configuration Guide

This project uses separate environment files for different deployment environments.

## Files

- **`.env`** - Local development environment (NOT tracked in git)
- **`.env.prod`** - Production environment template (tracked in git with placeholders)

## Local Development Setup

1. The `.env` file is already configured for local development:
   - Uses `localhost:3000` for frontend
   - Uses `localhost:5001` for backend
   - Points to development database

2. To start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment (Render)

### Step 1: Set Environment Variables in Render

Go to your Render service dashboard → Environment tab and set these variables:

**Server:**
- `NODE_ENV` = `production`
- `PORT` = `5001`

**Database (Neon PostgreSQL):**
- `DB_USER` = Your database user
- `DB_PASSWORD` = Your database password  
- `DB_NAME` = Your database name
- `DB_HOST` = Your Neon host
- `DATABASE_URL` = Full PostgreSQL connection URL

**JWT:**
- `JWT_SECRET` = Strong 64+ character secret
- `JWT_REFRESH_SECRET` = Different strong 64+ character secret

**Google OAuth:**
- `GOOGLE_CLIENT_ID` = Get from your `.env` file (not tracked in git)
- `GOOGLE_CLIENT_SECRET` = Get from your `.env` file (not tracked in git)
- `GOOGLE_CALLBACK_URL` = `https://vit-back.onrender.com/api/v1/auth/google/callback`

**Email (SMTP):**
- `SMTP_USER` = Get from your `.env` file
- `SMTP_PASSWORD` = Get from your `.env` file

**Frontend URLs:**
- `FRONTEND_URL` = `https://vituor.vercel.app`
- `PRODUCTION_FRONTEND_URL` = `https://vituor.vercel.app`

**Cloudflare R2:**
- `R2_ACCOUNT_ID` = Your R2 account ID
- `R2_BUCKET_NAME` = `vituor`
- `R2_ACCESS_KEY_ID` = Your R2 access key
- `R2_SECRET_ACCESS_KEY` = Your R2 secret key
- `R2_ENDPOINT` = Your R2 endpoint URL
- `R2_PUBLIC_URL` = Your R2 public URL

### Step 2: Deploy

Render will automatically:
1. Pull the latest code from GitHub
2. Install dependencies
3. Use the environment variables you configured
4. Start the server with `npm start`

## Troubleshooting

### CORS Issues
Make sure `FRONTEND_URL` and `PRODUCTION_FRONTEND_URL` match your actual frontend deployment URL.

### Role Routing Issues
Check the backend logs for lines like:
```
🔐 User Login: { email: '...', role: 'Editor', userId: '...' }
```

This shows what role is being returned from the database. If the role is incorrect, update it directly in the database `users` table.

### Database Connection Issues
- Ensure `DATABASE_URL` includes `?sslmode=require&channel_binding=require` for Neon
- Check that your IP is not blocked in Neon dashboard

## Security Notes

⚠️ **NEVER commit actual secrets to git!**
- `.env` is in `.gitignore` and should contain real secrets for local dev
- `.env.prod` is a TEMPLATE only with placeholders
- Set real production secrets in Render's environment variables
