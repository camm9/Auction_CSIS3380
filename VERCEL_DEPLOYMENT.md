# Vercel Deployment Guide for Auction CSIS3380

## Prerequisites
1. A Vercel account (vercel.com)
2. Vercel CLI installed globally: `npm install -g vercel`
3. All environment variables ready

## Environment Variables Required

### MongoDB
- `MONGO_URL` - Your MongoDB connection string

### Firebase Admin SDK
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID` 
- `FIREBASE_PRIVATE_KEY` - (replace \n with actual newlines)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_AUTH_URI`
- `FIREBASE_TOKEN_URI`
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `FIREBASE_CLIENT_X509_CERT_URL`

### Email (Nodemailer)
- `Google_user` - Your Gmail address
- `Google_App_Password` - Gmail app password

## Deployment Steps

### 1. Commit and Push Your Changes
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 2. Login to Vercel CLI
```bash
vercel login
```

### 3. Link Your Project
In your project directory, run:
```bash
vercel
```
- Choose "Link to existing project?" → No
- Choose your project name
- Choose the directory (current directory)
- Override settings? → No

### 4. Set Environment Variables

#### Option A: Using Vercel CLI
```bash
vercel env add MONGO_URL
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_CLIENT_ID
vercel env add FIREBASE_AUTH_URI
vercel env add FIREBASE_TOKEN_URI
vercel env add FIREBASE_AUTH_PROVIDER_X509_CERT_URL
vercel env add FIREBASE_CLIENT_X509_CERT_URL
vercel env add Google_user
vercel env add Google_App_Password
```

#### Option B: Using Vercel Dashboard
1. Go to your project on vercel.com
2. Navigate to Settings → Environment Variables
3. Add each variable with the value
4. Set them for "Production", "Preview", and "Development"

### 5. Deploy
```bash
vercel --prod
```

## Important Notes

### Firebase Private Key
When setting `FIREBASE_PRIVATE_KEY`, ensure newlines are preserved:
- In CLI: paste the entire key with actual newlines
- In Dashboard: copy the key exactly as it appears in your Firebase service account JSON

### MongoDB Connection
Ensure your MongoDB allows connections from 0.0.0.0/0 or add Vercel's IP ranges to your whitelist.

### Domain Configuration
After deployment:
1. Note your Vercel domain (e.g., `your-app.vercel.app`)
2. Update any hardcoded URLs in your Firebase configuration if needed
3. Update CORS settings if necessary

## File Structure Overview
```
/
├── api/
│   └── index.js          # Serverless function (all API routes)
├── client/
│   ├── css/
│   ├── js/               # Updated with /api/ URLs
│   └── public/
├── server/
│   ├── server.js         # Local development server
│   ├── nodemailer.js     # Email functions
│   └── models/
├── vercel.json           # Vercel configuration
└── package.json          # Updated with build scripts
```

## Testing Your Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Test creating auctions
4. Test bidding functionality
5. Test auction ending/canceling
6. Verify email notifications work

## Troubleshooting

### Common Issues:
1. **Environment Variables**: Ensure all are set correctly
2. **MongoDB**: Check connection string and IP whitelist
3. **Firebase**: Verify service account permissions
4. **Email**: Confirm Gmail app password is correct

### Debug Logs:
View logs in Vercel dashboard under Functions → View Function Logs

## Local Development vs Production

- **Local**: Use `npm run dev` (runs server/server.js on port 5001)
- **Production**: Vercel uses api/index.js as serverless function

Both environments use the same codebase but different entry points.
