// Shared CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const response = {
  success(data = null, statusCode = 200) {
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data,
      }),
    };
  },

  error(err, statusCode = 400) {
    console.error('Error:', err);

    const isString = typeof err === 'string';
    const providedStatus = (err && err.statusCode) || statusCode;
    const errorMessage = isString ? err : (err?.message || 'An unexpected error occurred');
    const errorCode = (err && err.code) || (isString ? 'ERROR' : 'UNKNOWN_ERROR');

    return {
      statusCode: providedStatus,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          ...(process.env.STAGE === 'dev' && !isString && { stack: err.stack }),
        },
      }),
    };
  },

  validationError(errors) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors,
        },
      }),
    };
  },

  notFound(message = 'Resource not found') {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message,
        },
      }),
    };
  },

  unauthorized(message = 'Unauthorized') {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message,
        },
      }),
    };
  },

  methodNotAllowed() {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed',
        },
      }),
    };
  },
};

module.exports = response;
