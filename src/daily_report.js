const parse = require('csv-parse')
const async = require('async')
const common = require('./common')

const BUCKET = process.env.COST_REPORTS_BUCKET
const SLACK_CHANNEL = process.env.SLACK_CHANNEL
let today = new Date()
today.setDate(today.getDate() - 2)
const thisDay = today.toISOString().substr(8, 2)
const thisMonth = today.toISOString().substr(0, 7)

let KEY = process.env.AWS_ACCOUNT_ID + '-aws-billing-detailed-line-items-with-resources-and-tags-%.csv.zip'
let FILE = process.env.AWS_ACCOUNT_ID + '-aws-billing-detailed-line-items-with-resources-and-tags-%.csv'
let acum = []
let acumDay = 0

KEY = KEY.replace('%', thisMonth)
FILE = FILE.replace('%', thisMonth)

if (!process.env.COST_REPORTS_BUCKET) throw new Error('Error running the report: COST_REPORTS_BUCKET envar not set')
if (!process.env.SLACK_CHANNEL) throw new Error('Error running the report: SLACK_CHANNEL envar not set')
if (!process.env.AWS_ACCOUNT_ID) throw new Error('Error running the report: AWS_ACCOUNT_ID envar not set')

acum = []
acumDay = 0

let parser = parse({
  delimiter: ','
}, function (err, data) {
  if (err) callback(err)

  let columnHeaders = common.getColumnPositions(data[0])

  async.eachSeries(data, function (line, callback) {
    processLine(line, columnHeaders).then(function () {
      callback()
    })
  }, function () {
    // Create Report
    let report = ''
    for (let key in acum) {
      if (acum[key].toFixed(2).toString() !== '0.00') {
        report += key.toString().replace('&', ' ') + ': $' + acum[key].toFixed(2).toString() + '\n'
      }
    }

    let message = 'payload={"channel": "' + SLACK_CHANNEL + '", "username": "AWS Daily Report", "text": "AWS cost report for ' + thisMonth + '-' + thisDay + '\n```\n' + report + '```\nTotal Spent: `' + acumDay.toFixed(2) + '`", "icon_emoji": ":aws:"}'

    // Send to Slack
    common.slackNotify(message)
  })
})

common.downloadAndExctract(BUCKET, KEY, FILE, parser)

const processLine = (line, columnHeaders) => {
  let date = line[columnHeaders.usageStartDateColumnNumber].split(' ')

  // If date is Yesterday
  if (date[0] === thisMonth + '-' + thisDay) {
    let key = date[0] + ' - ' + line[columnHeaders.productNameColumnNumber]

    // If is EC2 filter by Instance Name Tag
    if (line[columnHeaders.productNameColumnNumber] === 'Amazon Elastic Compute Cloud') {
      key = date[0] + ' - Amazon Elastic Compute Cloud (' + line[columnHeaders.instanceNameColumnNumber] + ')'
    }

    if (parseFloat(line[columnHeaders.blendedCostColumnNumber]) > 0) {
      acum[key] = parseFloat(acum[key] || 0) + parseFloat(line[columnHeaders.blendedCostColumnNumber])
      acumDay = parseFloat(acumDay) + parseFloat(line[columnHeaders.blendedCostColumnNumber])
    }
  }

  return new Promise(function (resolve, reject) {
    resolve()
  })
}