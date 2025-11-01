# StayConnect Architecture

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Maps**: Google Maps API
- **Hosting**: Firebase Hosting

## Data Flow
1. User searches/browses PGs → Firestore query
2. Add PG → Form → Firebase Storage (images) → Firestore
3. Authentication → Firebase Auth
4. Map view → Google Maps API + Firestore data