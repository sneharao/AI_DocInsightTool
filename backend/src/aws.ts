// It sets up the AWS credentials and exports the S3 and SQS clients for use in
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

export { s3, sqs };