# aws-cost-reporter

Tool to report AWS costs via [Slack](https://slack.com/)

## Instructions

This function could be used as standalone, but the way we use it is by setting a [AWS Cloudwatch](https://aws.amazon.com/cloudwatch/), and a [AWS Lambda](https://aws.amazon.com/lambda/) function

Since this project uses `node_modules`, we have 2 ways of passing the code to [AWS Lambda](https://aws.amazon.com/lambda/)

- Uploading to [AWS S3](https://aws.amazon.com/s3/)
- Creating a ZIP file and uploading to Lambda (We usually use this, but could be changed)

## Installation (The way we do it)

- Create a ZIP file
- Upload to [AWS Lambda](https://aws.amazon.com/lambda/)
- Set the [AWS Cloudwatch](https://aws.amazon.com/cloudwatch/) to call the function on the desired period of time
- You are all set
