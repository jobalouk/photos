'use strict'

const {admin, db} = require('../utils/admin')
const config = require('../utils/config')

const functions = require('firebase-functions')
const mkdirp = require('mkdirp')
const spawn = require('child-process-promise').spawn
const path = require('path')
const os = require('os')
const fs = require('fs')
const sharp = require('sharp')
const smartcrop = require('smartcrop-sharp')



exports.uploadImage = function(req, resp) {
  const Busboy= require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new Busboy({headers: req.headers})

  let opts = {}
  let _filename

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
      return resp.status(400).json({error: 'Wrong file type submited'})
    }

    const filePath = path.join(os.tmpdir(), filename)
    opts = {filePath, mimetype}
    _filename = filename
    file.pipe(fs.createWriteStream(filePath))
  })

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(opts.filePath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: opts.mimetype,
        }
      }
    })
    .then(() => {
      // Create two collection for the thumbnail and for the full size image
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${_filename}?alt=media`
      return db.collection('photos').add({imageUrl})
    })
    .then(() => {
      return resp.json({message: 'Image uploaded successfully'})
    })
    .catch(error => {
      console.error(error)
      return resp.status(500).json({error: error.code})
    })
  })
  busboy.end(req.rawBody)
}


exports.foo = async function(object) {
  const filePath = object.name
  const contentType = object.contentType
  const fileDir = path.dirname(filePath)
  let fileName = path.basename(filePath)
  fileName = fileName.substring(0, fileName.lastIndexOf(".")) + ".webp"
  const thumbFilePath = path.normalize(path.join(fileDir, `thumb_${fileName}`))

  const tempLocalFile = path.join(os.tmpdir(), filePath)
  const tempLocalDir = path.dirname(tempLocalFile)
  const tempLocalThumbFile = path.join(os.tmpdir(), thumbFilePath)

  // Cloud Storage files.
  const bucket = admin.storage().bucket(object.bucket)
  const file = bucket.file(filePath)
  const thumbFile = bucket.file(thumbFilePath)

  const metadata = {
    // Need to update the content type for the uploaded image!!!!
    contentType: contentType,
    // To enable Client-side caching you can set the Cache-Control headers here. Uncomment below.
    // 'Cache-Control': 'public,max-age=3600',
  }

  await mkdirp(tempLocalDir)

  // Exit if the image is already a thumbnail.
  if (fileName.startsWith('thumb_')) {
    console.log('Thumbnail already exist.')
    return
  }

  // Download file from bucket.
  await file.download({destination: tempLocalFile})
  console.log('The file has been downloaded to', tempLocalFile)

  const data = await applySmartCrop(tempLocalFile, tempLocalThumbFile, 300, 300)
  console.log(data)

  await bucket.upload(tempLocalThumbFile, {destination: thumbFilePath, metadata: metadata})
  console.log('Thumbnail uploaded to Storage at', thumbFilePath)

  fs.unlinkSync(tempLocalFile)
  fs.unlinkSync(tempLocalThumbFile)

  return console.log('Success!')
}



// Max height and width of the thumbnail in pixels.
const THUMB_MAX_HEIGHT = 200
const THUMB_MAX_WIDTH = 200
const THUMB_PREFIX = 'thumb_'

exports.generateThumbnail = async function(object) {
  const filePath = object.name
  const contentType = object.contentType

  const fileDir = path.dirname(filePath)
  const fileName = path.basename(filePath)
  const thumbFilePath = path.normalize(path.join(fileDir, `${THUMB_PREFIX}${fileName}`))

  const tempLocalFile = path.join(os.tmpdir(), filePath)
  const tempLocalDir = path.dirname(tempLocalFile)
  const tempLocalThumbFile = path.join(os.tmpdir(), thumbFilePath)

  if (!contentType.startsWith('image/')) {
    return console.log('This is not an image.')
  }

  if (fileName.startsWith(THUMB_PREFIX)) {
    return console.log('Already a Thumbnail.')
  }

  // Cloud Storage files.
  const bucket = admin.storage().bucket(object.bucket)
  const file = bucket.file(filePath)
  const thumbFile = bucket.file(thumbFilePath)
  const metadata = {
    contentType: contentType,
    // To enable Client-side caching you can set the Cache-Control headers here. Uncomment below.
    // 'Cache-Control': 'public,max-age=3600',
  }

  await mkdirp(tempLocalDir)

  // Download file from bucket.
  await file.download({destination: tempLocalFile})
  console.log('The file has been downloaded to', tempLocalFile)

  // Generate a thumbnail using ImageMagick.
  await spawn('convert', [tempLocalFile, '-thumbnail', `${THUMB_MAX_WIDTH}x${THUMB_MAX_HEIGHT}>`, tempLocalThumbFile], {capture: ['stdout', 'stderr']})
  console.log('Thumbnail created at', tempLocalThumbFile)


  // Uploading the Thumbnail.
  await bucket.upload(tempLocalThumbFile, {destination: thumbFilePath, metadata: metadata})
  console.log('Thumbnail uploaded to Storage at', thumbFilePath)

  // Once the image has been uploaded delete the local files to free up disk space.
  fs.unlinkSync(tempLocalFile);
  fs.unlinkSync(tempLocalThumbFile);

  const config = {
    action: 'read',
    expires: '03-01-2500',
  }

  // Get the Signed URLs for the thumbnail and original image.
  const results = await Promise.all([
    thumbFile.getSignedUrl(config),
    file.getSignedUrl(config),
  ])

  const thumbResult = results[0]
  const origiynalResult = results[1]
  const thumbFileUrl = thumbResult[0]
  const fileUrl = originalResult[0]

  // Add the URLs to the Database
  await admin.database().ref('images').push({path: fileUrl, thumbnail: thumbFileUrl})
  return console.log('Thumbnail URLs saved to database.')
}


function applySmartCrop(src, dest, width, height) {
  return smartcrop.crop(src, { width: width, height: height })
    .then(function(result) {
      const crop = result.topCrop
      return sharp(src)
        .extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
        .resize(width, height)
        .webp({lossless: true})
        .toFile(dest)
    })
}
