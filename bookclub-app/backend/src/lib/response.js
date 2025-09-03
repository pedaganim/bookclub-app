const response = {
  success(data = null, statusCode = 200) {
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: true,
        data,
      }),
    };
  },

  error(error, statusCode = 400) {
    console.error('Error:', error);
    
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    return {
      statusCode: error.statusCode || statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          ...(process.env.STAGE === 'dev' && { stack: error.stack }),
        },
      }),
    };
  },

  validationError(errors) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Allow': 'GET, POST, PUT, DELETE, OPTIONS',
      },
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
