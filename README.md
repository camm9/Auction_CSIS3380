# Auction_CSIS3380

#### Instructions to Run Locally
Requirements: .env file
1. Install required Node packages
2. From Auction_CSIS3380 directory, run "node server/server.js" 
3. Access from web browser using http://localhost:5001

#### Instructions to Run on Vercel
1. Vist https://auction-csis-3380.vercel.app/


## Set Up Guide for Local Development
1. Create a .env file with the following variables:
###### Database
MONGO_URL=mongodb+srv://username:password@CLUSTERURL
###### Server
* PORT=5001
###### Firebase Configuration
* Google_ApiKey
* Google_authDomain
* Google_projectId
* Google_storageBucket
* Google_messagingSenderId
* Google_appId
* Google_measurementId
###### Email Configuration for Notifications
* Google_App_Password
* Google_user
* Google_Sender_Mail

2. Add your "firebase-adminsdk.json" from Firebase console file to the /server folder.
* Add the following line to your Express server (server/server.js): const serviceAccount = require("./firebase-adminsdk.json");

## Project Structure
Auction_CSIS3380/
├── client/                 # Frontend files
├── server/                 # Backend server
│   ├── server.js          # Main Express server for local dev
│   └── auctioncsis3380-firebase-adminsdk.json  # Firebase SDK keys
├── api/                   # Vercel serverless functions
├── .env                   # Environment variables



