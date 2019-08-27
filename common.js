const request = require('request')
const SLACK_URL = process.env.SLACK_URL
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const unzipper = require('unzipper')
const fs = require('fs')

module.exports = (function () {
  // Send a notification to Slack
  function slackNotify (message, callback) {
    console.log('Sending to Slack...')

    // curate string to avoid errors
    message = message.replace('&', '')

    let options = {
      url: SLACK_URL,
      method: 'POST',
      form: message
    }

    // Start the request
    request(options, function (error, response, body) {
      if (error) return callback(error)

      if (response.statusCode !== 200) {
        let payload = 'statusCode: ' + response.statusCode + ' statusMessage: ' + response.statusMessage + ' body: ' + body
        callback(payload)
      }

      callback(null, 'Message sent to Slack...' + body)
    })
  }

  function downloadAndExctract (BUCKET, KEY, FILE, parser) {
    // Download File, Unzip, Extract to /tmp and Read it
    s3.getObject({ Bucket: BUCKET, Key: KEY }).createReadStream()
      .on('error', function (err) {
        console.log('ERROR: ', err)
      })
      .on('end', function () {
        fs.createReadStream('/tmp/' + FILE).pipe(parser)
      })
      .pipe(unzipper.Extract({ path: '/tmp' }))
  }

  // We use this function to know in which column is the data that we need
  // For example: In which column number is the Product Name...
  function getColumnPositions (line) {
    let columnHeaders = {}

    columnHeaders.productNameColumnNumber = line.indexOf('ProductName')
    columnHeaders.instanceNameColumnNumber = line.indexOf('user:Name')
    columnHeaders.blendedCostColumnNumber = line.indexOf('BlendedCost')
    columnHeaders.usageStartDateColumnNumber = line.indexOf('UsageStartDate')

    return columnHeaders
  }

  return {
    slackNotify,
    downloadAndExctract,
    getColumnPositions
  }
})()
