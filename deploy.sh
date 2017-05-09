########## Daily Report

# Rename $REPORT_TYPE.package.json to package.json since its the file that
# Lambda uses to know which file in the ZIP is going to excec
cp daily_report.package.json package.json

# Create ZIP file
zip -r deploy.zip . -x *.git*

# Upload to AWS Lambda & Run
aws lambda update-function-code --function-name myDailyReport --zip-file fileb://deploy.zip --region us-west-2
aws lambda invoke --function-name myDailyReport output.txt --region us-west-2

# Remove ZIP file
rm deploy.zip output.txt
