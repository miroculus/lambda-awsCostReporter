const request = require('request')
const SLACK_URL = '**REMOVED**'
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const unzip = require('unzip')
const fs = require('fs')

module.exports = (function(){
  function slackNotify (message, callback) {
    console.log('Sending to Slack...')

    let options = {
      url: SLACK_URL,
      method: 'POST',
      form: message
    }

    // Start the request
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        callback(null, 'Message sent to Slack...')
      }
    })
  }

  function downloadAndExctract (BUCKET, KEY, FILE, parser) {
    //Download File, Unzip, Extract to /tmp and Read it
    s3.getObject({Bucket: BUCKET, Key: KEY }).createReadStream()
      .on('error', function (err) {
        console.log('ERROR: ', err)
      })
      .on('end', function () {
        fs.createReadStream('/tmp/' + FILE).pipe(parser)
      })
      .pipe(unzip.Extract({ path: '/tmp' }))
  }

  return {
    slackNotify,
    downloadAndExctract
  }
})()
