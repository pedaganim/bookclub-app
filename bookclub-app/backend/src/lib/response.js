/**
 * Response utility module for standardized API responses
 * Provides consistent HTTP response formatting for AWS Lambda functions
 */
const response = {
  /**
   * Creates a successful HTTP response
   * @param {*} data - The data to include in the response body
   * @param {number} statusCode - HTTP status code, defaults to 200
   * @returns {Object} Formatted HTTP response object with CORS headers
   */
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

  /**
   * Creates an error HTTP response
   * @param {Error} error - The error object containing message and optional code
   * @param {number} statusCode - HTTP status code, defaults to 400
   * @returns {Object} Formatted HTTP error response with CORS headers
   */
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

  /**
   * Creates a validation error response
   * @param {Object} errors - Object containing field validation errors
   * @returns {Object} Formatted HTTP validation error response with 400 status
   */
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

  /**
   * Creates a not found error response
   * @param {string} message - Custom error message, defaults to 'Resource not found'
   * @returns {Object} Formatted HTTP 404 response
   */
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

  /**
   * Creates an unauthorized error response
   * @param {string} message - Custom error message, defaults to 'Unauthorized'
   * @returns {Object} Formatted HTTP 401 response
   */
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

  /**
   * Creates a method not allowed error response
   * @returns {Object} Formatted HTTP 405 response with allowed methods header
   */
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
