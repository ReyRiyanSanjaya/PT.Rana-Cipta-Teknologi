const successResponse = (res, data, message = 'Success', code = 200) => {
  return res.status(code).json({
    status: 'success',
    message,
    data,
  });
};

const fs = require('fs');
const path = require('path');

const errorResponse = (res, message = 'Something went wrong', code = 500, error = null) => {
  if (process.env.NODE_ENV === 'development' && error) {
    console.error(error);
  }
  let errorDetails = undefined;
  if (process.env.NODE_ENV === 'development' && error) {
      errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
      try {
          const logPath = path.join(__dirname, '../../error_log.txt');
          const logEntry = `[${new Date().toISOString()}] ${message}\n${JSON.stringify(errorDetails, null, 2)}\n\n`;
          fs.appendFileSync(logPath, logEntry);
      } catch (e) {
          // ignore
      }
  }
  return res.status(code).json({
    status: 'error',
    message,
    error: errorDetails,
  });
};

module.exports = { successResponse, errorResponse };
