const functions = require('firebase-functions')
const app = require('express')()
const cors = require('cors')({origin: true})


const {signIn, logIn} = require('./APIs/users.js')
const {uploadImage, generateThumbnail, foo} = require('./APIs/photos.js')

app.post('/signin', signIn)
app.post('/login', logIn)

app.use(cors)
app.post('/image', uploadImage)


// Expose those functions
exports.api = functions.https.onRequest(app)
exports.test = functions.storage.object().onFinalize(foo)
