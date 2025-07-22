// This file sets up the Express.js application for the Document Summarizer API.
// It includes basic routes and error handling middleware.
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import { s3, sqs } from './aws'; // Import S3 and SQS
import { v4 as uuidv4 } from 'uuid'; // To generate unique IDs

dotenv.config(); // Load environment variables from .env file

const app = express();

/* We configure Multer to use memoryStorage. This means the file will be stored in memory (as a Buffer) before being uploaded to S3. This is generally fine for smaller files. For larger files, you might consider using diskStorage.
We set a limits option to restrict the file size to 5MB */
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.get('/hello', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello from the Document Summarizer API!' });
});

// Route to handle document upload
// This route will accept a file upload, store it in S3, and send a message
app.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded.' });
    }

    const file = req.file;
    const bucketName = process.env.S3_BUCKET_NAME;
    const queueUrl = process.env.SQS_QUEUE_URL;

    if (!bucketName || !queueUrl) {
      console.error('S3_BUCKET_NAME or SQS_QUEUE_URL not set in environment variables.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const documentId = uuidv4();
    const filename = `${documentId}-${file.originalname}`; // Create a unique filename

    const uploadParams = {
      Bucket: bucketName,
      Key: filename,
      Body: file.buffer,
    };
    console.log(`Uploading document: ${filename} to bucket: ${bucketName}`);

    await s3.upload(uploadParams).promise(); // Upload to S3

    const sqsParams = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        documentId: documentId,
        filename: filename,
      }),
    };
    console.log(`Sending message to SQS queue: ${queueUrl} for document: ${filename}`);

    await sqs.sendMessage(sqsParams).promise(); // Send message to SQS

    res.status(200).json({ message: 'Document uploaded successfully.', documentId: documentId });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});



// Error handling middleware (basic example)
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;