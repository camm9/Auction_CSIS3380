# Auction_CSIS3380

## How to Use
###### Sign In or Register
Sign in with your email and password. Or register with a new email and password.
![](./doc_imgs/signin.png)

On registration, pick a username.
![](./doc_imgs/register.png)

###### Shop for Items
Browse items you're interested in.
![](./doc_imgs/browse.png)

Use the search bar to look for specific items.
![](./doc_imgs/search.png)

Bid on items. Bids must be at least $0.10 higher than the current bid.
![](./doc_imgs/bid.png)

View all your previous bids by going to the User Account page. Scroll to bottom of page.
![](./doc_imgs/pastbids.png)

You may only have a total of 5 active bids at one time.
![](./doc_imgs/activebidslimit.png)

###### List an Item for Sale
In User Account page, go to modal named "Create A New Listing". Fill in the form. Images must be URL string. Users can only have 30 active items listed at a time.
![](./doc_imgs/createlisting.png)
![](./doc_imgs/30itemlimit.png)

You can view your item's bid history by selecting the "View Bid History" button.
![](./doc_imgs/itembidhistory.png)

You can end an item auction in one of two ways: cancel the auction and declare no winner or end auction and declare winner.
![](./doc_imgs/closeauction.png)

When you close an auction, your item listing is removed from the browse feature and the modal turns red in User Account page.
![](./doc_imgs/itemlistings.png)

###### Notifications
Users receive email notifications when they win an auction or win they are outbid on an item.


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
PORT=5001
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



