# Deployment Guide

This guide covers deploying ClientChain to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Frontend Deployment](#frontend-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Post-Deployment](#post-deployment)
6. [Monitoring](#monitoring)

## Prerequisites

Before deploying, ensure you have:

- [ ] Supabase project created
- [ ] GitHub repository set up
- [ ] Domain name configured (optional)
- [ ] Vercel/Netlify account
- [ ] Production environment variables ready

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Build Locally (Test)
```bash
pnpm build
```

#### Step 3: Deploy
```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set build command: `pnpm build`
- Set output directory: `dist`
- Set framework preset: `Vite`

#### Step 4: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Step 5: Production Deployment
```bash
vercel --prod
```

### Option 2: Netlify

#### Step 1: Create netlify.toml
```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### Step 2: Deploy via CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

Or connect your GitHub repository in the Netlify dashboard for automatic deployments.

#### Step 3: Environment Variables

In Netlify Dashboard → Site settings → Environment variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Option 3: Custom Server (AWS/DigitalOcean)

#### Build the app
```bash
pnpm build
```

#### Serve with Nginx
```nginx
server {
    listen 80;
    server_name clientchain.app;
    root /var/www/clientchain/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

## Backend Deployment

The backend runs on Supabase Edge Functions (Deno runtime).

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

Find your project ref in Supabase Dashboard → Settings → General

### Step 4: Deploy Edge Functions

```bash
# Deploy the server function
supabase functions deploy make-server-0491752a

# Or deploy all functions
supabase functions deploy
```

### Step 5: Verify Deployment

Test the health endpoint:
```bash
curl https://your-project.supabase.co/functions/v1/make-server-0491752a/health
```

Expected response:
```json
{"status":"ok"}
```

### Step 6: Set Function Environment Variables

In Supabase Dashboard → Edge Functions → Configuration:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=your-database-url
```

**Important**: The service role key is automatically available in Edge Functions as `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`

## Environment Configuration

### Development
```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Staging
```bash
# staging environment
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
```

### Production
```bash
# production environment
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

## Post-Deployment

### 1. Test Demo Accounts

Visit your deployed site and test login with:
- Client: `demo@clientchain.com` / `demo123456`
- Admin: `admin@clientchain.com` / `admin123456`

### 2. Configure Domain

#### Vercel
- Go to Settings → Domains
- Add your custom domain
- Update DNS records as instructed

#### Netlify
- Go to Domain management → Custom domains
- Add domain and follow DNS setup

### 3. Enable HTTPS

Both Vercel and Netlify provide automatic SSL certificates.

For custom servers:
```bash
# Using Let's Encrypt
sudo certbot --nginx -d clientchain.app
```

### 4. Set Up CORS (if needed)

Update CORS settings in `/supabase/functions/server/index.tsx`:
```typescript
cors({
  origin: "https://clientchain.app",  // Your production domain
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
})
```

### 5. Database Backup

Set up automatic backups in Supabase Dashboard → Settings → Backups:
- Enable daily backups
- Set retention period (7-30 days recommended)

## Monitoring

### 1. Supabase Monitoring

Monitor in Supabase Dashboard:
- **Database**: Query performance, connections
- **Edge Functions**: Invocations, errors, logs
- **Auth**: Active users, sign-ins
- **Storage**: Usage metrics

### 2. Frontend Monitoring

#### Vercel Analytics
Enable in Vercel Dashboard → Analytics

#### Google Analytics
Add to your app:
```typescript
// src/app/App.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router';

function App() {
  const location = useLocation();
  
  useEffect(() => {
    // Track page views
    if (window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location.pathname,
      });
    }
  }, [location]);
  
  // ...
}
```

### 3. Error Tracking

Recommended: Sentry for error tracking

```bash
pnpm add @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 4. Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- `https://your-app.com` (frontend)
- `https://your-project.supabase.co/functions/v1/make-server-0491752a/health` (backend)

### 5. Log Aggregation

View logs:
```bash
# Supabase function logs
supabase functions logs make-server-0491752a

# Or in real-time
supabase functions logs make-server-0491752a --follow
```

## Performance Optimization

### 1. Enable Caching

Add cache headers in Vercel (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Image Optimization

Use Vercel Image Optimization or Cloudinary:
```typescript
import Image from 'next/image'; // If using Next.js
```

### 3. Database Connection Pooling

Enable in Supabase Dashboard → Settings → Database → Connection pooling

### 4. CDN Configuration

Use Cloudflare for:
- DDoS protection
- Global CDN
- WAF (Web Application Firewall)
- Rate limiting

## Security Checklist

- [ ] Environment variables are set in hosting platform (not in code)
- [ ] Service role key is never exposed to frontend
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (Supabase Edge Functions have built-in limits)
- [ ] Database RLS policies are configured
- [ ] Authentication tokens expire appropriately
- [ ] Content Security Policy (CSP) headers are set
- [ ] Regular security updates are applied

## Rollback Procedure

### Frontend (Vercel)
```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Backend (Supabase)
```bash
# Redeploy previous version
git checkout previous-commit
supabase functions deploy make-server-0491752a
```

## Troubleshooting Deployment Issues

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
pnpm install
pnpm build
```

### Function Deployment Fails
```bash
# Check function logs
supabase functions logs make-server-0491752a

# Verify function exists
supabase functions list
```

### Environment Variables Not Working
- Verify variable names match exactly (case-sensitive)
- For Vite, variables must be prefixed with `VITE_`
- Redeploy after adding new variables

### CORS Errors
- Check allowed origins in server configuration
- Verify request headers match allowed headers
- Ensure preflight OPTIONS requests are handled

## Support

For deployment issues:
1. Check Supabase status: status.supabase.com
2. Check Vercel status: vercel-status.com
3. Review deployment logs
4. Contact support: support@clientchain.app

---

**Last Updated**: February 2026
