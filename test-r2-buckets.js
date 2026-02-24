import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function listBuckets() {
    try {
        console.log('Attempting to list buckets...');
        const command = new ListBucketsCommand({});
        const response = await r2.send(command);
        console.log('Success! Buckets found:', response.Buckets.map(b => b.Name));
    } catch (err) {
        console.error('Failed to list buckets:', err);
        if (err.Code === 'AccessDenied') {
            console.error('The credentials provided do not have permission to list buckets.');
        }
    }
}

listBuckets();
