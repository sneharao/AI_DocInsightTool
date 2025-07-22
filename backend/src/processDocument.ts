// src/processDocument.ts
import { s3, sqs } from './aws';
import AWS from 'aws-sdk';
import pdfParse from 'pdf-parse';
import * as docx from 'docx';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Helper function to extract text from PDF
async function extractTextFromPdf(bucket: string, key: string): Promise<string> {
  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    console.log(`Extracting text from PDF: ${key} in bucket: ${bucket}`);
    const data = await s3.getObject(params).promise();
    if (!data.Body) {
      throw new Error(`PDF data is null or undefined`);
    }
    const pdfData = await pdfParse(data.Body as Buffer);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

// Helper function to call Cohere API for summarization
async function summarizeText(text: string): Promise<string> {
  const cohereApiKey = process.env.COHERE_API_KEY;
  if (!cohereApiKey) {
    throw new Error('COHERE_API_KEY is not set in environment variables.');
  }
  const url = 'https://api.cohere.ai/v1/summarize'; // Replace with the correct Cohere API endpoint

  try {
    const response = await axios.post(url, {
      text: text,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cohereApiKey}`,
      },
    });

    return response.data.summary; // Modify this to fit Cohere's actual response structure
  } catch (error:any) {
    console.error('Error calling Cohere API:', error.response ? error.response.data : error.message);
    throw new Error(`Cohere API error: ${error.response ? error.response.data : error.message}`);
  }
}

// Helper function to call Amazon Translate API
async function translateText(text: string, targetLanguage: string): Promise<string> {
  const translate = new AWS.Translate();
  try {
    const params = {
      Text: text,
      SourceLanguageCode: 'en', // Assuming source language is English
      TargetLanguageCode: targetLanguage,
    };
    const data = await translate.translateText(params).promise();
    return data.TranslatedText || "";
  } catch (error) {
    console.error('Error calling Amazon Translate API:', error);
    throw error;
  }
}

// Helper function to store results in DynamoDB
async function storeResultsInDynamoDB(documentId: string, summary: string, translation: string): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME is not set in environment variables.');
  }

  const params = {
    TableName: tableName,
    Key: {
      documentId: documentId,
    },
    UpdateExpression: 'set summary = :summary, translation = :translation',
    ExpressionAttributeValues: {
      ':summary': summary,
      ':translation': translation,
    },
    ReturnValues: 'UPDATED_NEW', // Return the updated attributes
  };

  try {
    await dynamoDb.update(params).promise();
    console.log(`Results stored in DynamoDB for document ID: ${documentId}`);
  } catch (error) {
    console.error('Error storing results in DynamoDB:', error);
    throw error;
  }
}

export const processDocument = async (documentId: string, filename: string): Promise<void> => {
  console.log(`Processing document: ${documentId} - ${filename}`);
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME is not set in environment variables.');
  }

  try {
    let text: string;
    if (filename.endsWith('.pdf')) {
      text = await extractTextFromPdf(bucketName, filename);
    } else {
      throw new Error(`Unsupported file type: ${filename}`);
    }
    
    const summary = await summarizeText(text);
    const translation = await translateText(summary, 'de'); // Translate to German

    await storeResultsInDynamoDB(documentId, summary, translation);

    console.log(`Document ${documentId} processed successfully.`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    throw error;
  }
};