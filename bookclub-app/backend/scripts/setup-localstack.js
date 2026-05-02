/**
 * setup-localstack.js
 * Creates S3 bucket in LocalStack for local development.
 * Run: npm run local:setup-s3
 */
const AWS = require('aws-sdk');

const LOCALSTACK = 'http://localhost:4566';
const BUCKET = 'bookclub-app-local-book-covers';
const REGION = 'us-east-1';

AWS.config.update({
  region: REGION,
  accessKeyId: 'local',
  secretAccessKey: 'local',
  s3: { endpoint: LOCALSTACK, s3ForcePathStyle: true },
});

const s3 = new AWS.S3();

async function setup() {
  console.log('Setting up LocalStack S3...');

  // Create bucket
  try {
    await s3.createBucket({ Bucket: BUCKET }).promise();
    console.log(`✅ Created bucket: ${BUCKET}`);
  } catch (e) {
    if (e.code === 'BucketAlreadyOwnedByYou' || e.code === 'BucketAlreadyExists') {
      console.log(`ℹ️  Bucket already exists: ${BUCKET}`);
    } else {
      throw e;
    }
  }

  // Set CORS so the browser can PUT directly to LocalStack
  await s3.putBucketCors({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [{
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      }],
    },
  }).promise();
  console.log('✅ CORS configured on bucket');

  // Make bucket public-read so images load in the browser
  await s3.putBucketPolicy({
    Bucket: BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${BUCKET}/*`,
      }],
    }),
  }).promise();
  console.log('✅ Bucket policy set (public-read)');

  console.log(`\n🪣  S3 bucket ready: http://localhost:4566/${BUCKET}`);
  console.log('   Image URLs will be: http://localhost:4566/' + BUCKET + '/<key>');
}

setup().catch(e => { console.error('❌ Setup failed:', e.message); process.exit(1); });
