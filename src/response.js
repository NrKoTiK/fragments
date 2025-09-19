// src/response.js

/**
 * A successful response looks like:
 *
 * {
 *   "status": "ok",
 *   ...
 * }
 */
module.exports.createSuccessResponse = function (data) {
  return {
    status: 'ok',
    ...data,
  };
};

module.exports.createErrorResponse = function (code, message) {
  return {
    status: 'error',
    error: {
      code, // ts is supposed to be like 400 or sum
      message, // ts is supposed to be like 'not found' or sum
    },
  };
};
