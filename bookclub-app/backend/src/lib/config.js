const { z } = require('zod');

const ConfigSchema = z.object({
  STAGE: z.string().default('dev'),
  REGION: z.string().default('us-east-1'),
  BOOKS_TABLE: z.string().default('bookclub-books-dev'),
  BOOK_COVERS_BUCKET: z.string().default('bookclub-covers-dev'),
  EVENT_BUS_NAME: z.string().optional(),
  EVENT_BUS_SOURCE: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  IS_OFFLINE: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  BEDROCK_ANALYZE_QUEUE_URL: z.string().optional(),
});

// Environment variables are accessed through process.env
const env = {
  STAGE: process.env.STAGE,
  REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
  BOOKS_TABLE: process.env.BOOKS_TABLE,
  BOOK_COVERS_BUCKET: process.env.BOOK_COVERS_BUCKET,
  EVENT_BUS_NAME: process.env.EVENT_BUS_NAME,
  EVENT_BUS_SOURCE: process.env.EVENT_BUS_SOURCE,
  LOG_LEVEL: process.env.LOG_LEVEL,
  IS_OFFLINE: process.env.IS_OFFLINE,
  BEDROCK_ANALYZE_QUEUE_URL: process.env.BEDROCK_ANALYZE_QUEUE_URL,
};

let config;
try {
  config = ConfigSchema.parse(env);
} catch (error) {
  console.error('Invalid configuration:', error.format());
  // In production, we might want to exit, but for Lambda, we just log and hope for the best
  // or use defaults where possible.
  config = env; // Fallback to raw env if validation fails for some reason
}

module.exports = config;
