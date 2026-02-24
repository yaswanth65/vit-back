import { S3Client, HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 R2 Credentials Diagnostic\n');

// Display masked credentials
const accessKey = process.env.R2_ACCESS_KEY_ID;
const secretKey = process.env.R2_SECRET_ACCESS_KEY;
console.log('📋 Environment Variables:');
console.log(`  Endpoint: ${process.env.R2_ENDPOINT}`);
console.log(`  Bucket: ${process.env.R2_BUCKET_NAME}`);
console.log(`  Access Key: ${accessKey.substring(0, 10)}...${accessKey.substring(accessKey.length - 5)}`);
console.log(`  Secret Key: ${secretKey.substring(0, 10)}...${secretKey.substring(secretKey.length - 5)}`);
console.log(`  Account ID: ${process.env.R2_ACCOUNT_ID}\n`);

// Test 1: Check if endpoint is reachable
console.log('Test 1: Network Connectivity');
try {
  const response = await fetch(`${process.env.R2_ENDPOINT}/`);
  console.log(`  ✅ Endpoint reachable (HTTP ${response.status})\n`);
} catch (err) {
  console.log(`  ❌ Network error: ${err.message}\n`);
}

// Test 2: Try ListBuckets (validates credentials)
console.log('Test 2: Credential Validation via ListBuckets');
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const result = await s3Client.send(new ListBucketsCommand({}));
  console.log(`  ✅ Credentials verified`);
  if (result.Buckets && result.Buckets.length > 0) {
    console.log(`  Found ${result.Buckets.length} bucket(s):`);
    result.Buckets.forEach(b => console.log(`    - ${b.Name}`));
  } else {
    console.log(`  No buckets found`);
  }
  console.log();
} catch (err) {
  console.log(`  ❌ ListBuckets Error: ${err.Code || err.name}`);
  console.log(`  Message: ${err.message}`);
  if (err.$metadata) {
    console.log(`  HTTP Status: ${err.$metadata.httpStatusCode}`);
    console.log(`  Request ID: ${err.$metadata.requestId}`);
  }
  console.log();
}

// Test 3: Try HeadBucket specifically on configured bucket
console.log(`Test 3: HeadBucket "${process.env.R2_BUCKET_NAME}"`);
try {
  const result = await s3Client.send(
    new HeadBucketCommand({
      Bucket: process.env.R2_BUCKET_NAME,
    })
  );
  console.log(`  ✅ Bucket is accessible`);
  if (result.$metadata) {
    console.log(`  HTTP Status: ${result.$metadata.httpStatusCode}\n`);
  }
} catch (err) {
  console.log(`  ❌ Error: ${err.Code || err.name}`);
  console.log(`  Message: ${err.message}`);
  if (err.$metadata) {
    console.log(`  HTTP Status: ${err.$metadata.httpStatusCode}`);
  }
  if (err.name === 'NoSuchBucket') {
    console.log(`  → Bucket does not exist`);
  } else if (err.name === 'Forbidden') {
    console.log(`  → Access denied - check credentials/permissions`);
  } else if (err.Code === 'InvalidAccessKeyId') {
    console.log(`  → Invalid Access Key ID`);
  }
  console.log();
}

console.log('🏁 Diagnostic Complete');
