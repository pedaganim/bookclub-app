const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.STAGE || 'dev',
    service: 'bookclub-backend',
  },
  // Use pino-pretty in development for readable logs
  ...(process.env.IS_OFFLINE === 'true' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

module.exports = logger;
