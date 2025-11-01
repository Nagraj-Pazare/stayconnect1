# StayConnect

StayConnect — Student PG & Room Finder (Web)

## Features
- Post PG/room listings with images and facilities.
- Search listings by area/address.
- View listings on interactive Google Map.
- Firebase Auth for owners/students (Email/password).
- Firebase Firestore for data storage and optional Storage for images.

## Quick Start
1. Clone project and put images in `public/images/`.
2. Add Firebase config to `config/firebaseConfig.js` and Google key to `config/mapConfig.js`.
3. Enable Firestore, Auth, Storage in Firebase Console.
4. Install firebase-tools: `npm i -g firebase-tools`
5. `firebase login` then `firebase init` (choose Hosting & Firestore rules if wanted).
6. `firebase deploy` to publish.

## Notes
- Replace placeholders for API keys before running.
- Secure Firestore rules before production.
