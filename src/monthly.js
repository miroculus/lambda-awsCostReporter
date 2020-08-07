const parse = require('csv-parse')
const async = require('async')
const common = require('./common')

const BUCKET = process.env.COST_REPORTS_BUCKET
const SLACK_CHANNEL = process.env.SLACK_CHANNEL
let today = new Date()
today.setMonth(today.getMonth() - 1)
const thisMonth = today.toISOString().substr(0, 7)

const KEY = (process.env.AWS_ACCOUNT_ID + '-aws-billing-detailed-line-items-with-resources-and-tags-%.csv.zip').replace('%', thisMonth)
const FILE = (process.env.AWS_ACCOUNT_ID + '-aws-billing-detailed-line-items-with-resources-and-tags-%.csv').replace('%', thisMonth)

let acum = {}
let acumTotal = 0

if (!process.env.COST_REPORTS_BUCKET) throw new Error('Error running the report: COST_REPORTS_BUCKET envar not set')
if (!process.env.SLACK_CHANNEL) throw new Error('Error running the report: SLACK_CHANNEL envar not set')
if (!process.env.AWS_ACCOUNT_ID) throw new Error('Error running the report: AWS_ACCOUNT_ID envar not set')

const parser = parse({delimiter: ','}, function (err, data) {
  if (err) throw new Error(err)

  const columnHeaders = common.getColumnPositions(data[0])

  async.eachSeries(data, function (line, callback) {
    processLine(line, columnHeaders).then(function () {
      callback()
    })
  }, function () {
    // Create Report
    let report = ''
    for (const key in acum) {
      if (acum[key].toFixed(2).toString() !== '0.00') { report += key.toString().replace('&', ' ') + ': $' + acum[key].toFixed(2).toString() + '\n' }
    }

    // Send to Slack
    common.slackNotify('payload={"channel": "' + SLACK_CHANNEL + '", "username": "AWS Monthly Report", "text": "AWS cost report for ' + thisMonth + '\n```\n' + report + '\n```\nTotal Spent: `' + acumTotal.toFixed(2) + '`", "icon_emoji": ":aws:"}')
  })
})

common.downloadAndExctract(BUCKET, KEY, FILE, parser)

const processLine = (line, columnHeaders) => {
  const date = line[columnHeaders.usageStartDateColumnNumber].split(' ')

  // If date is in this Month
  if ((date[0].substr(0, 7) === thisMonth) && (line[columnHeaders.productNameColumnNumber] !== 'AWS Support (Business)')) {
    let key = line[columnHeaders.productNameColumnNumber]

    // If is EC2 filter by Instance Name Tag
    if (line[columnHeaders.productNameColumnNumber] === 'Amazon Elastic Compute Cloud') {
      key = 'Amazon Elastic Compute Cloud (' + line[columnHeaders.instanceNameColumnNumber] + ')'
    }
    if (parseFloat(line[columnHeaders.blendedCostColumnNumber]) > 0) {
      acum[key] = parseFloat(acum[key] || 0) + parseFloat(line[columnHeaders.blendedCostColumnNumber])
      acumTotal = parseFloat(acumTotal) + parseFloat(line[columnHeaders.blendedCostColumnNumber])
    }
  }

  return Promise.resolve()
}
