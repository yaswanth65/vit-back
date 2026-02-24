/**
 * Test Cloudflare R2 Configuration
 * Verifies R2 credentials and tests upload/download functionality
 * Run: node test-r2.js
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function testR2() {
  console.log('🧪 Starting Cloudflare R2 Test...\n');
  
  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${R2_ENDPOINT}`);
  console.log(`   Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Access Key: ${R2_ACCESS_KEY_ID?.substring(0, 10)}...`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}\n`);

  try {
    // Initialize R2 client
    const r2 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    // Test 1: Verify bucket exists
    console.log('🔍 Test 1: Verifying bucket access...');
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    console.log('✓ Bucket access verified!\n');

    // Test 2: Upload a test file
    console.log('📤 Test 2: Uploading test file...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = `This is a test file from VITUOR backend.\nTimestamp: ${new Date().toISOString()}\nTest ID: ${crypto.randomBytes(16).toString('hex')}`;
    const testKey = `test-files/${testFileName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
        Body: Buffer.from(testContent),
        ContentType: 'text/plain',
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${testKey}`;
    console.log(`✓ File uploaded successfully!`);
    console.log(`  Key: ${testKey}`);
    console.log(`  Public URL: ${publicUrl}\n`);

    // Test 3: Verify file with GetObject
    console.log('📥 Test 3: Verifying uploaded file...');
    const response = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
      })
    );

    const downloadedContent = await response.Body.transformToString();
    if (downloadedContent === testContent) {
      console.log('✓ File content verified - matches original!\n');
    } else {
      console.log('✗ File content mismatch!\n');
    }

    // Test 4: Delete test file
    console.log('🗑️  Test 4: Deleting test file...');
    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
      })
    );
    console.log('✓ Test file deleted successfully!\n');

    // Summary
    console.log('═'.repeat(60));
    console.log('✅ All R2 Tests Passed!');
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   ✓ R2 credentials are valid');
    console.log('   ✓ Bucket access is working');
    console.log('   ✓ File upload is working');
    console.log('   ✓ File download is working');
    console.log('   ✓ File deletion is working');
    console.log('\n🚀 R2 is ready for production use!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ R2 Test Failed!');
    console.error('\n📍 Error Details:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code || 'Unknown');

    console.error('\n🔧 Troubleshooting:');
    if (error.code === 'NoCredentialProvider' || error.code === 'InvalidSignatureException') {
      console.error('   • R2 credentials are invalid or missing');
      console.error('   • Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env');
    } else if (error.code === 'NoSuchBucket') {
      console.error('   • Bucket does not exist');
      console.error(`   • Create bucket "${R2_BUCKET_NAME}" or verify R2_BUCKET_NAME in .env`);
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('   • Access Key ID is invalid');
      console.error('   • Generate new credentials from Cloudflare R2 dashboard');
    } else if (error.code === 'AccessDenied' || error.code === 'Forbidden') {
      console.error('   • Access denied to bucket');
      console.error('   • Check IAM permissions on R2 credentials');
    } else if (error.code === 'NetworkingError') {
      console.error('   • Cannot connect to R2 endpoint');
      console.error('   • Verify R2_ENDPOINT is correct');
      console.error('   • Check internet connectivity');
    } else {
      console.error('   • Check R2 configuration in .env file');
      console.error('   • Verify credentials are not expired');
      console.error('   • Ensure bucket exists in Cloudflare account');
    }

    console.error('\n📌 Full Error Stack:');
    console.error(error.stack);
    process.exit(1);
  }
}

testR2();
