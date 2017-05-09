const fs = require('fs')
const unzip = require('unzip')
const parse = require('csv-parse')
const async = require('async')
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

const BUCKET = '**REMOVED**'
let today = new Date()
today.setDate(today.getDate() - 1)
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

  //If date is Yesterday
  if (date[0] === this_month + '-' + this_day) {
    let key = date[0] + ' - ' + line[5]

    //If is EC2 filter by Instance Name Tag
    if ((line[5] == 'Amazon Elastic Compute Cloud') && (line[10] == 'RunInstances')) {
      key = date[0] + ' - Amazon EC2 Instance (' + line[24] + ')'
    }
    acum[key] = parseFloat(acum[key] || 0) + parseFloat(line[18])
    acum_day = parseFloat(acum_day) + parseFloat(line[18])
  }

  return new Promise(function (resolve, reject) {
    resolve()
  })
};

exports.handler = (event, context, callback) => {
  acum = []
  acum_day = 0

  //Download File, Unzip, Extract to /tmp and Read it
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
      //Create Report
      let report = ''
      for (var key in acum) {
        if (acum[key].toFixed(2).toString()!='0.00')
          report += key.toString().replace('&', ' ') + ': $' + acum[key].toFixed(2).toString() + '\n'
      }

      let message = 'payload={"channel": "#aws_reports", "username": "AWS Daily Report", "text": "AWS cost report for ' + this_month + '-' +  this_day + ' \n```' + report + '\n``` \n Total Spent: `' + acum_day.toFixed(2) + '`", "icon_emoji": ":aws:"}'

      //Send to Slack
      slackNotify(message, callback)
    })
  })
}
