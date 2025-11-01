// scripts/backup_firestore.js
// Usage: node backup_firestore.js > backup.json
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json'); // generate from Firebase console
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function dump(){
  const snapshot = await db.collection('pg_listings').get();
  const data = snapshot.docs.map(d=> ({ id: d.id, ...d.data() }));
  console.log(JSON.stringify(data, null, 2));
}
dump().catch(err => console.error(err));
