const admin = require('firebase-admin')

const serviceAccount = require('../private/photo-s-fcf7e-firebase-adminsdk-mwu9w-3f2879ae58.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://photo-s-fcf7e.firebaseio.com",
  storageBucket: "photo-s-fcf7e.appspot.com",
})

const db = admin.firestore()

module.exports = {admin, db}
