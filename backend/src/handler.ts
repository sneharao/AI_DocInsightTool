// src/handler.ts
import { SQSEvent, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { processDocument, getSummary, getTranslation } from './processDocument'; // Import getSummary
const HEADERS = {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
};
export const handler = async (event: SQSEvent | APIGatewayProxyEvent): Promise<void | APIGatewayProxyResult> => {
  console.log('Lambda function triggered');

  // Check if it's an SQS event
  if ((event as SQSEvent).Records) {
    console.log('Processing SQS event');
    try {
      for (const record of (event as SQSEvent).Records) {
        const message = JSON.parse(record.body);
        await processDocument(message.documentId, message.filename);
      }
    } catch (error) {
      console.error('Error processing messages:', error);
      throw error; // Important: Throw the error to retry the message
    }
  }
    // Check if it's a GET /summary/{documentId} API Gateway event
  else if ((event as APIGatewayProxyEvent).pathParameters?.documentId && !(event as APIGatewayProxyEvent).pathParameters?.language) {
    console.log('Processing API Gateway event');

    try {
      const documentId = (event as APIGatewayProxyEvent).pathParameters?.documentId;
      if (!documentId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing documentId in path parameters" }),
        };
      }
      const summary = await getSummary(documentId);
      if (summary) {
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ summary }),
        };
      } else {
        return {
          statusCode: 404,
          headers: HEADERS,
          body: JSON.stringify({ message: 'Summary not found' }),
        };
      }
    } catch (error) {
      console.error('Error processing API Gateway event:', error);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }
      // Check if it's a GET /translation/{documentId}/{language} API Gateway event
     else if ((event as APIGatewayProxyEvent).pathParameters?.documentId && (event as APIGatewayProxyEvent).pathParameters?.language) {
      console.log('Processing API Gateway GET /translation event');
      try {
        const documentId = (event as APIGatewayProxyEvent).pathParameters?.documentId;
        const language = (event as APIGatewayProxyEvent).pathParameters?.language; // Extract language
        if (!documentId || !language) {
          throw new Error('Missing documentId or language in path parameters');
        }
        const translation = await getTranslation(documentId, language); // Pass language to getTranslation

        if (translation) {
          return {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin": "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({ translation }),
          };
        } else {
          return {
            statusCode: 404,
            headers: {
              "Access-Control-Allow-Origin": "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify({ message: 'Translation not found' }),
          };
        }
      } catch (error) {
        console.error('Error processing API Gateway GET /translation event:', error);
        return {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
          },
          body: JSON.stringify({ error: 'Internal Server Error' }),
        };
      }
    }
  else {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Unknown event type" }),
    };
  }
};