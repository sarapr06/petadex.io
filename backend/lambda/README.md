# PETadex Search Lambda Functions

AWS Lambda functions for sequence similarity search using MMseqs2.

## Architecture

```
┌─────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│   Frontend      │──────│   API Gateway     │──────│   Lambda        │
│   (Gatsby)      │      │  api.petadex.org  │      │   Functions     │
└─────────────────┘      └───────────────────┘      └─────────────────┘
                                                            │
                         ┌──────────────────────────────────┼──────────────────────────────────┐
                         │                                  │                                  │
                         ▼                                  ▼                                  ▼
              ┌─────────────────────┐          ┌─────────────────────┐          ┌─────────────────────┐
              │  submit-search      │──────────│  petadex-mmseqs2-   │──────────│  get-results        │
              │  POST /search       │  async   │  search (existing)  │  writes  │  GET /results/{id}  │
              │                     │  invoke  │                     │  to S3   │                     │
              └─────────────────────┘          └─────────────────────┘          └─────────────────────┘
                                                                                           │
                                                                                           │ reads
                                                                               ┌───────────┴───────────┐
                                                                               │  list-searches        │
                                                                               │  GET /searches        │
                                                                               └───────────────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────┐
                                               │  S3: petadex/       │
                                               │  results/{id}.json  │
                                               │  results/{id}.status│
                                               └─────────────────────┘
```

## Functions

### submit-search

Handles `POST /search` requests:

1. Validates the protein sequence (10-10,000 amino acids)
2. Generates a unique job ID (UUID v4)
3. Invokes `petadex-mmseqs2-search` Lambda asynchronously
4. Returns `{ job_id, status: "processing" }`

**Environment Variables:**
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `MMSEQS2_LAMBDA_NAME`: Name of the MMseqs2 search Lambda (default: `petadex-mmseqs2-search`)

### get-results

Handles `GET /results/{job_id}` requests:

1. Validates job ID format (UUID v4)
2. Checks S3 for results file (`results/{job_id}.json`)
3. Returns results or status (`processing`, `failed`, `not_found`)

**Environment Variables:**
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `RESULTS_BUCKET`: S3 bucket name (default: `petadex`)
- `RESULTS_PREFIX`: S3 key prefix (default: `results`)

### list-searches

Handles `GET /searches` requests:

1. Lists all result files in S3 (`results/*.json`)
2. Fetches metadata for each search (query length, hit count, top hit)
3. Returns sorted list (most recent first)

**Query Parameters:**
- `limit`: Maximum results to return (default: 50, max: 100)
- `next_token`: Pagination token for next page

**Environment Variables:**
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `RESULTS_BUCKET`: S3 bucket name (default: `petadex`)
- `RESULTS_PREFIX`: S3 key prefix (default: `results`)

**Response:**
```json
{
  "searches": [
    {
      "job_id": "uuid",
      "timestamp": "2024-01-15T12:00:00Z",
      "query_length": 290,
      "num_results": 10,
      "top_hit": {
        "target_id": "WP_054022242.1",
        "percent_identity": 98.5
      }
    }
  ],
  "count": 20,
  "next_token": null
}
3. Returns results or status (`processing`, `failed`, `not_found`)

**Environment Variables:**
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `RESULTS_BUCKET`: S3 bucket name (default: `petadex`)
- `RESULTS_PREFIX`: S3 key prefix (default: `results`)

## Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ installed

### 1. Install Dependencies

```bash
cd backend/lambda
npm install
```

### 2. Create Deployment Packages

```bash
# Create zip files for each function
cd submit-search && zip -r ../submit-search.zip . && cd ..
cd get-results && zip -r ../get-results.zip . && cd ..
```

### 3. Create Lambda Functions

```bash
# Submit Search Lambda
aws lambda create-function \
  --function-name petadex-submit-search \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://submit-search.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/petadex-lambda-role \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{MMSEQS2_LAMBDA_NAME=petadex-mmseqs2-search}'

# Get Results Lambda
aws lambda create-function \
  --function-name petadex-get-results \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://get-results.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/petadex-lambda-role \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{RESULTS_BUCKET=petadex,RESULTS_PREFIX=results}'
```

### 4. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
  --name "PETadex Search API" \
  --description "Sequence similarity search API" \
  --endpoint-configuration types=REGIONAL

# Get the API ID from the output, then create resources and methods
# (See API Gateway setup section below)
```

## API Gateway Setup

### Resources

| Method | Path | Lambda |
|--------|------|--------|
| POST | /search | petadex-submit-search |
| GET | /results/{job_id} | petadex-get-results |

### CORS Configuration

Enable CORS on both resources with:
- Allowed Origins: `https://petadex.net`, `https://www.petadex.net`
- Allowed Methods: `GET, POST, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

### Custom Domain

1. Request/import SSL certificate in ACM for `api.petadex.org`
2. Create custom domain in API Gateway
3. Map the base path to your API stage
4. Create Route 53 record pointing to the API Gateway domain

## IAM Role Permissions

The Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:petadex-mmseqs2-search"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::petadex/results/*"
    }
  ]
}
```

## Modifying the Existing MMseqs2 Lambda

The existing `petadex-mmseqs2-search` Lambda needs to be updated to:

1. Accept the new payload format:
```json
{
  "job_id": "uuid",
  "sequence": "MKTL...",
  "max_results": 50
}
```

2. Write results to S3:
```python
import boto3
import json

s3 = boto3.client('s3')

def write_results(job_id, results):
    s3.put_object(
        Bucket='petadex',
        Key=f'results/{job_id}.json',
        Body=json.dumps(results),
        ContentType='application/json'
    )

def write_status(job_id, status, error=None):
    s3.put_object(
        Bucket='petadex',
        Key=f'results/{job_id}.status',
        Body=json.dumps({'status': status, 'error': error}),
        ContentType='application/json'
    )
```

3. Handle errors gracefully by writing status files.

## Local Development

The Express backend (`backend/src/routes/search.js`) provides a local development endpoint that simulates the Lambda behavior:

```bash
# Start the backend
cd backend
npm run dev

# Test the search endpoint
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"sequence": "MKTLGRL...", "max_results": 50}'

# Poll for results
curl http://localhost:3001/api/search/results/{job_id}
```

The local endpoint returns mock results for development purposes.

## Frontend Configuration

Set the `GATSBY_SEARCH_API_URL` environment variable to use the API Gateway:

```bash
# .env.production
GATSBY_SEARCH_API_URL=https://api.petadex.org
```

If not set, the component falls back to `config.apiUrl` (the Express backend).
