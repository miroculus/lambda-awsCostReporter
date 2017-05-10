const fs = require('fs')
const unzip = require('unzip')
const parse = require('csv-parse')
const async = require('async')
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const common = require('./common')

const BUCKET = '**REMOVED**'
let today = new Date();
today.setMonth(today.getMonth() - 1)
const this_month = today.toISOString().substr(0, 7)

let KEY = '**REMOVED**-aws-billing-detailed-line-items-with-resources-and-tags-%.csv.zip'
let FILE = '**REMOVED**-aws-billing-detailed-line-items-with-resources-and-tags-%.csv'
let acum = []

KEY = KEY.replace('%', this_month)
FILE = FILE.replace('%', this_month)

function processLine (line) {
  let date = line[14].split(' ')

  //If date is in this Month
  if ((date[0].substr(0,7) === this_month) && (line[5] !='AWS Support (Business)')) {
    let key = line[5]

    //If is EC2 filter by Instance Name Tag
    if (line[5] == 'Amazon Elastic Compute Cloud') {
      key = 'Amazon Elastic Compute Cloud (' + line[24] + ') ' + line[10]
    }
    if (parseFloat(line[18])>0){
      acum[key] = parseFloat(acum[key] || 0) + parseFloat(line[18])
      acum_total = parseFloat(acum_total) + parseFloat(line[18])
    }
  }

  return new Promise(function (resolve, reject) {
    resolve()
  })
};

exports.handler = (event, context, callback) => {
  acum = []

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

      let message = 'payload={"channel": "#aws_reports", "username": "AWS Monthly Report", "text": "AWS cost report for ' + this_month  + ' \n```' + report + '\n``` \n Total Spent: `?`", "icon_emoji": ":aws:"}'

      //Send to Slack
      common.slackNotify(message, callback)
    })
  })
}
