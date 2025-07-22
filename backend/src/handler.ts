// This file will contain the Lambda handler function that wraps your Express.js application.
import { SQSEvent } from 'aws-lambda';
import { processDocument } from './processDocument';

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log('Document processing Lambda function triggered');
  try {
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      await processDocument(message.documentId, message.filename);
    }
  } catch (error) {
    console.error('Error processing messages:', error);
    throw error; // Important: Throw the error to retry the message
  }
};