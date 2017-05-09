const request = require('request')
const SLACK_URL = '**REMOVED**'

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
        console.log('Message sent to Slack...')

        callback(null, 'finish report')
      }
    })
  }

  return {
    slackNotify
  }
})()
