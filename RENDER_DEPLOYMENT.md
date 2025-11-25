# Render Deployment Guide

This guide explains how to deploy your backend API to Render with a Neon PostgreSQL database.

## Prerequisites

- A Render account (sign up at https://render.com)
- A Neon PostgreSQL database (you already have this)
- Your Neon database connection string

## Step 1: Get Your Neon Database Connection String

1. Go to your Neon dashboard
2. Navigate to your project and database
3. Copy the connection string (it should look like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. **Important**: Make sure the connection string includes SSL parameters (`?sslmode=require` or `?ssl=true`)

## Step 2: Create a Web Service on Render

1. Log in to Render dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your repository (GitHub/GitLab/Bitbucket)
4. Select your repository and the `online-survey-backend` directory

## Step 3: Configure Build & Start Commands

In the Render service settings, configure:

### Build Command:
```bash
npm ci && npm run build
```

**Note**: `npm ci` is recommended for production builds as it ensures a clean, reproducible install. Alternatively, you can use `npm install` if `npm ci` doesn't work.

### Start Command:
```bash
npm start
```

### Root Directory:
```
online-survey-backend
```

## Step 4: Configure Environment Variables

In the Render dashboard, go to **Environment** section and add these variables:

### Required Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Full PostgreSQL connection string from Neon (includes SSL) |
| `DATABASE_SSL` | `true` | Enable SSL for database connection |
| `NODE_ENV` | `production` | Set to production mode |
| `PORT` | `10000` | Render automatically sets this, but you can use 10000 as default |
| `JWT_SECRET` | A strong random string | Generate a secure random string (e.g., use `openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration (optional, defaults to 7d) |
| `CORS_ORIGIN` | Your frontend URL | The URL where your frontend is hosted (e.g., `https://your-frontend.onrender.com` or your custom domain) |

### Example Environment Variables:

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
DATABASE_SSL=true
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend.onrender.com
```

## Step 5: Configure Service Settings

### Instance Type:
- **Free tier**: Choose "Free" (spins down after inactivity)
- **Paid tier**: Choose "Starter" ($7/month) for always-on service

### Health Check Path:
```
/health
```

### Auto-Deploy:
- Enable **"Auto-Deploy"** if you want automatic deployments on git push

## Step 6: Deploy and Run Migrations

### Automatic Migrations (Recommended)

**Migrations now run automatically on server startup!** 

The server will automatically run all database migrations when it starts. This is safe because:
- All migrations are idempotent (safe to run multiple times)
- They use `IF NOT EXISTS` and `CREATE OR REPLACE` statements
- If migrations fail, the server will still start (with a warning)

Just deploy and the migrations will run automatically. Check the logs to verify migrations completed successfully.

### Manual Migration (Alternative - if needed)

If you need to run migrations manually, you can access Render's Shell:

1. Go to your service in Render dashboard
2. Click on the **Shell** tab (or look for "Open Shell" button)
3. Run the migration commands:

```bash
npm run db:migrate
npm run db:migrate-users
npm run db:migrate-respondent-age
npm run db:migrate-password
```

**Note**: The automatic migration system runs all these migrations on startup, so manual execution is usually not needed.

## Step 7: Verify Deployment

1. Check the **Logs** tab to ensure the service started successfully
2. Visit `https://your-service-name.onrender.com/health` to verify it's running
3. Test your API endpoints

## Important Notes

### Database Connection

- Your code already handles SSL connections when `NODE_ENV=production` or `DATABASE_SSL=true`
- Neon requires SSL connections, so make sure `DATABASE_SSL=true` is set
- The connection string from Neon should already include SSL parameters

### CORS Configuration

- Update `CORS_ORIGIN` to match your frontend URL
- If you have multiple origins, you may need to modify the CORS configuration in `src/app.ts`

### JWT Secret

- **Never commit** your JWT_SECRET to git
- Use a strong, random string (at least 32 characters)
- You can generate one using:
  ```bash
  openssl rand -base64 32
  ```
  Or use an online generator

### Port Configuration

- Render automatically sets the `PORT` environment variable
- Your code uses `process.env.PORT || 3000`, which will work correctly
- You don't need to manually set PORT, but it won't hurt if you do

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct and includes SSL parameters
- Check that `DATABASE_SSL=true` is set
- Ensure your Neon database allows connections from Render's IPs (Neon should allow all by default)

### Build Failures

- Check the build logs in Render dashboard
- Ensure all dependencies are listed in `package.json`
- Verify TypeScript compilation succeeds locally first

### Service Won't Start

- Check the logs for error messages
- Verify all required environment variables are set
- Ensure the start command is correct: `npm start`

### Migration Issues

- Run migrations manually via the Shell tab
- Check database connection before running migrations
- Verify you have the correct database permissions in Neon

## Next Steps

1. Set up your frontend deployment (if not already done)
2. Update frontend API base URL to point to your Render backend
3. Configure custom domain (optional, requires paid plan)
4. Set up monitoring and alerts (optional)

## Render Service URL Format

Your API will be available at:
```
https://your-service-name.onrender.com
```

API endpoints will be:
- Health check: `https://your-service-name.onrender.com/health`
- Surveys: `https://your-service-name.onrender.com/api/surveys`
- Users: `https://your-service-name.onrender.com/api/users`

