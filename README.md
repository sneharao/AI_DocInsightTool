# AI_DocInsightTool
💡 AI-Powered Document Insight Tool (Mini Aleph Alpha Frontend Replica) A web app where users can upload or paste documents (e.g., contracts, reports, laws), and get AI-generated insights like:  Summaries  Key entities  Questions &amp; Answers  Sentiment or stance detection

# Document Summarizer Backend

This backend application provides the API endpoints and logic for summarizing and translating documents. It's built using Node.js, TypeScript, Express.js, and AWS services like Lambda, API Gateway, S3, SQS, DynamoDB, and Amazon Translate (or Cohere/OpenAI for summarization).

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Prerequisites](#prerequisites)
3.  [Setup and Installation](#setup-and-installation)
    *   [Local Development](#local-development)
    *   [AWS Configuration](#aws-configuration)
        *   [S3 Bucket Setup](#s3-bucket-setup)
        *   [SQS Queue Setup](#sqs-queue-setup)
        *   [IAM Role Configuration](#iam-role-configuration)
        *   [Lambda Function Deployment and Configuration](#lambda-function-deployment-and-configuration)
        *   [API Gateway Configuration](#api-gateway-configuration)
        *   [DynamoDB Table Setup](#dynamodb-table-setup)
4.  [Configuration](#configuration)
5.  [Deployment](#deployment)
6.  [Common Issues and Solutions (Troubleshooting)](#common-issues-and-solutions-troubleshooting)
7.  [API Endpoints](#api-endpoints)
8.  [Folder Structure](#folder-structure)
9.  [Dependencies](#dependencies)
10. [Contributing](#contributing)
11. [License](#license)

## Project Overview

This project implements a serverless backend for a document summarization and translation application. Users can upload PDF or DOCX documents, which are then summarized and translated using AI services. The application leverages AWS services for scalability, cost-effectiveness, and reliability.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/) (Node Package Manager)
*   [TypeScript](https://www.typescriptlang.org/)
*   [AWS CLI](https://aws.amazon.com/cli/) (configured with your AWS credentials)
*   [Serverless Framework](https://www.serverless.com/) or [AWS CDK](https://aws.amazon.com/cdk/) (optional, but recommended for infrastructure as code)
*   An account with [Cohere](https://cohere.com/) or [OpenAI](https://openai.com/) (for summarization API key)

## Setup and Installation

### Local Development

1.  **Clone the repository:**

    ```bash
    git clone [your-repository-url]
    cd backend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env` file:**

    Copy the `.env.example` file (if you have one) to `.env` and fill in the required environment variables (see [Configuration](#configuration) section).

4.  **Build the project:**

    ```bash
    npm run build
    ```

5.  **Run the application locally (for testing API End points):**

    ```bash
    npm run dev
    ```

### AWS Configuration

This section details the AWS services you need to configure for the backend to function correctly.

#### S3 Bucket Setup

1.  **Create an S3 bucket:**
    *   Go to the AWS S3 console.
    *   Click "Create bucket".
    *   Enter a unique bucket name (e.g., `docsum-yourname-uniqueid`).
    *   Choose a region.
    *   Use default values for everything else and click "Create bucket".
2.  **Note the bucket name:** You'll need this for the `S3_BUCKET_NAME` environment variable.

#### SQS Queue Setup

1.  **Create an SQS queue:**
    *   Go to the AWS SQS console.
    *   Click "Create queue".
    *   Choose "Standard queue" or "FIFO queue" (Standard is sufficient for this project).
    *   Enter a queue name (e.g., `docsum-processing-queue`).
    *   Use default values for everything else and click "Create queue".
2.  **Note the queue URL:** You'll need this for the `SQS_QUEUE_URL` environment variable.

#### IAM Role Configuration

1.  **Create an IAM role for the Lambda function:**
    *   Go to the IAM console.
    *   Click "Roles" in the left sidebar.
    *   Click "Create role".
    *   Select "AWS service" as the trusted entity type.
    *   Choose "Lambda" as the service that will use this role.
    *   Click "Next".
    *   Attach the following policies (either managed policies or custom policies):
        *   `AmazonS3ReadOnlyAccess` (or a custom policy that grants `s3:GetObject` on your bucket)
        *   `SQSFullAccess` (or a custom policy that grants `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` on your queue)
        *   `AmazonDynamoDBFullAccess` (or a custom policy that grants `dynamodb:GetItem`, `dynamodb:PutItem,dynamodb:UpdateItem` on your table)
        *   `TranslateFullAccess` (or a custom policy that grants `translate:TranslateText`)
        *   `CloudWatchLogsFullAccess` (or a custom policy that grants `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`)
    *   Click "Next".
    *   Give your role a name (e.g., `lambda-document-processing-role`) and description.
    *   Click "Create role".
2.  **Trust relationship (Important):**
    *   Edit the trust relationship of the role to allow the Lambda service to assume it. The trust relationship should include this statement:

        ```json
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        ```

#### Lambda Function Deployment and Configuration

1.  **Create a Lambda function:**
    *   Go to the AWS Lambda console.
    *   Click "Create function".
    *   Choose "Author from scratch".
    *   **Function name:** Give your function a name (e.g., `document-processing-lambda`).
    *   **Runtime:** Select "Node.js 18.x" (or a later supported version).
    *   **Architecture:** Choose `x86_64`.
    *   **Permissions:** Choose "Use an existing role" and select the IAM role you created earlier.
    *   Click "Create function".
2.  **Upload your code:**
    * Make the zip file of code to upload to Lambda  function using below commands one by one 
        cd dist
        zip -r9 ../lambda.zip *
        cd ..
        zip -r9 lambda.zip node_modules
    * In the Lambda function's configuration, go to the "Code" tab.
    *   Under "Code source", click "Upload from" and choose ".zip file".
    *   Upload the ZIP file you created (make sure it contains the `dist` directory and `node_modules` at the root).
3.  **Handler:**
    *   Set the "Handler" to `handler.handler`.
4.  **Environment variables:**
    *   Go to the "Configuration" tab and select "Environment variables".
    *   Add the following environment variables:
        *   `AWS_DEFAULT_REGION`: Your AWS Region (e.g., `us-east-1`)
        *   `S3_BUCKET_NAME`: The name of your S3 bucket.
        *   `SQS_QUEUE_URL`: The URL of your SQS queue.
        *   `COHERE_API_KEY` (or `OPENAI_API_KEY`): Your Cohere or OpenAI API key.
        *   `DYNAMODB_TABLE_NAME`: The name of your DynamoDB table.
5.  **Timeout and Memory:**
    *   Go to the "Configuration" tab and select "General configuration".
    *   Click "Edit" and set the "Timeout" to a reasonable value (e.g., 30 seconds or 1 minute).
    *   Set the "Memory" to an appropriate value (e.g., 256 MB or 512 MB). Increase if you experience memory issues.
6.  **Configure SQS Trigger:**
    *   Go to the "Triggers" tab and click "Add trigger".
    *   Select "SQS".
    *   Choose your SQS queue.
    *   Configure batch size and other options as needed.
    *   Click "Add".

#### API Gateway Configuration

1.  **Create API Gateway endpoints:**
    *   Go to the API Gateway console.
    *   Create a new API (REST API).
    *   Create a `POST /upload` resource/method:
        *   Integration type: Lambda Function
        *   Use Lambda Proxy integration.
        *   Select your `document-processing-lambda` function.
    *   Create a `GET /summary/{documentId}` resource/method:
        *   Integration type: Lambda Function
        *   Use Lambda Proxy integration.
        *   Select your `document-processing-lambda` function.
    *   Deploy the API to a stage (e.g., "dev").
    *   Note the invoke URL for your API.

#### DynamoDB Table Setup

1.  **Create a DynamoDB table:**
    *   Go to the DynamoDB console.
    *   Click "Create table".
    *   **Table name:** Enter a table name (e.g., `docUploadsWithDocumentId`).
    *   **Partition key:** Enter `documentId` for the name and select "String" for the data type.
    *   **Add additional attributes summary(String) and translations(String)**
    *   Leave other settings as default. On-demand is good
    *   Click "
