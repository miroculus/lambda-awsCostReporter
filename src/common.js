const request = require('request')
const SLACK_URL = process.env.SLACK_URL
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const unzipper = require('unzipper')
const fs = require('fs')


/**
 * Send a notification to Slack
 * @param {{
 *   message: string
 * }}
 */
const slackNotify = (message) => {
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

    return('Message sent to Slack...' + body)
  })
}

/**
 * Download and Extract the cost report
 * @param {{
 *   BUCKET: string
 *   KEY: string
 *   FILE: string
 *   parser: string
 * }}
 */
const downloadAndExctract = (BUCKET, KEY, FILE, parser) => {
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

/**
 * Get Column Positions
 * We use this function to know in which column is the data that we need
 * For example: In which column number is the Product Name...
 * @param {{
 *   BUCKET: string
 *   KEY: string
 *   FILE: string
 *   parser: string
 * }}
 */
const getColumnPositions = (line) => {
  let columnHeaders = {}

  columnHeaders.productNameColumnNumber = line.indexOf('ProductName')
  columnHeaders.instanceNameColumnNumber = line.indexOf('user:Name')
  columnHeaders.blendedCostColumnNumber = line.indexOf('BlendedCost')
  columnHeaders.usageStartDateColumnNumber = line.indexOf('UsageStartDate')

  return columnHeaders
}

module.exports = {
  slackNotify,
  downloadAndExctract,
  getColumnPositions
}