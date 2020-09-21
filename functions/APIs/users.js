const {admin, db} = require('../utils/admin')
const config = require('../utils/config')
const firebase = require('firebase')

firebase.initializeApp(config)

exports.logIn = function(req, resp) {
  const {email, password} = req.body

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      return resp.json({token})
    })
    .catch(error => {
      console.error(error)
      return resp.status(403).json({general: 'wrong credentials'})
    })
}

exports.signIn = function(req, resp) {
  const {userName, password, email} = req.body

  firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(data => {
    userId = data.user.uid
    return data.user.getIdToken()
  })
  .then(token => {
    return resp.status(201).json({token})
  })
  .then(token => {
    return db.collection('users').doc(userName).set({userName, email, userId})
  })
  .catch(error => {
    console.error(error)
    if (error.code === 'auth/email-already-in-use') {
      return resp.status(400).json({email: 'Email already in use'})
    } else {
      return resp.status(500).json({general: 'Something went wrong, please try again'})
    }
  })
}
