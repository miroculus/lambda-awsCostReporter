const fs = require('fs')
const unzip = require('unzip')
const parse = require('csv-parse')
const async = require('async')
const request = require('request')

const AWS = require('aws-sdk')
const s3 = new AWS.S3()

const BUCKET = '**REMOVED**'
let today = new Date()
today.setDate(today.getDate() - 2)
const this_day = today.toISOString().substr(8, 2)
const this_month = today.toISOString().substr(0, 7)

let KEY = '**REMOVED**-aws-billing-detailed-line-items-with-resources-and-tags-%.csv.zip'
let FILE = '**REMOVED**-aws-billing-detailed-line-items-with-resources-and-tags-%.csv'
let acum = []
let acum_day = 0

KEY = KEY.replace('%', this_month)
FILE = FILE.replace('%', this_month)

function processLine (line) {
  let date = line[14].split(' ')
  if (date[0] === this_month + '-' + this_day) {
    let key = date[0] + ' - ' + line[5]
    if ((line[5] == 'Amazon Elastic Compute Cloud') && (line[10] == 'RunInstances')) {
      key = date[0] + ' - ec2 - ' + line[24]
    }
    acum[key] = parseFloat(acum[key] || 0) + parseFloat(line[18])
    acum_day = parseFloat(acum_day) + parseFloat(line[18])
  }

  return new Promise(function (resolve, reject) {
    resolve()
  })
};

function slackNotify (callback) {
  console.log('Sending to Slack...')
  let report = ''

  for (var key in acum) {
    report += key.toString().replace('&', ' ') + ': $' + acum[key].toFixed(2).toString().replace('&', ' ') + '\n'
  }

  let options = {
    url: '**REMOVED**',
    method: 'POST',
    form: 'payload={"channel": "#aws_reports", "username": "AWS", "text": "By EC2 \n```' + report + '\n``` \n Total Spent: `' + acum_day.toFixed(2) + '`", "icon_emoji": ":aws:"}'
  }

  // Start the request
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('Message sent to Slack...')

      callback(null, 'finish report')
    }
  })
}

exports.handler = (event, context, callback) => {
  acum = []
  acum_day = 0
  s3.getObject({Bucket: BUCKET, Key: KEY }).createReadStream()
    .on('error', function (err) {
      console.log('ERROR: ', err)
    })
    .on('end', function () {
      fs.createReadStream('/tmp/' + FILE).pipe(parser)
    })
    .pipe(unzip.Extract({ path: '/tmp' }))

  let parser = parse({delimiter: ','}, function (err, data) {
    async.eachSeries(data, function (line, callback) {
      processLine(line).then(function () {
        callback()
      })
    }, function () {
      slackNotify(callback)
    })
  })
}
