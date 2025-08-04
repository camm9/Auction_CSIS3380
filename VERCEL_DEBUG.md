# Vercel Deployment Debug Guide

## Current Issue
Getting 404 errors when trying to access API endpoints on Vercel.

## Debug Steps

### Step 1: Deploy and Test Basic Connectivity
1. Deploy to Vercel with current changes
2. Visit your deployed URL + `/debug-api.html` (e.g., `https://your-app.vercel.app/debug-api.html`)
3. This will show you:
   - Basic network information
   - Test the `/api/items` endpoint
   - Test the new `/api/test` endpoint

### Step 2: Check Vercel Function Logs
1. In Vercel dashboard, go to your project
2. Click on "Functions" tab
3. Look for any function logs when you try to access API endpoints
4. Check if the API requests are reaching the serverless function

### Step 3: Test Individual Endpoints
Use the debug tool to test:
- `/api/test` (simple test endpoint)
- `/api/items` (your existing endpoint)
- `/api/place-bid` (the problematic endpoint)

### Step 4: Common Vercel Issues and Solutions

#### Issue 1: Incorrect Route Matching
**Symptoms:** 404 errors for all API routes
**Solution:** Check if `vercel.json` routes are correct

#### Issue 2: Express App Export
**Symptoms:** Function exists but doesn't respond
**Current Export:** `module.exports = app;`
**Alternative:** 
```javascript
module.exports = (req, res) => {
    return app(req, res);
};
```

#### Issue 3: Environment Variables
**Symptoms:** API works but database/auth fails
**Check:** Ensure all environment variables are set in Vercel dashboard

### Step 5: Alternative Approach
If current approach doesn't work, we can try:
1. Creating individual API files instead of one Express app
2. Using Vercel's built-in API routes format

## What to Report Back
1. Can you access `/debug-api.html`?
2. What do you see in the network info section?
3. What happens when you click "Test /api/items"?
4. Any error messages in Vercel function logs?
5. Does the simple `/api/test` endpoint work?

## Rollback Plan
If nothing works, we can:
1. Create separate API files for each endpoint
2. Use Vercel's native API format instead of Express
