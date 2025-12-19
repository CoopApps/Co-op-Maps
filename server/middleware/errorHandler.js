const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Should be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.userId : 'anonymous'
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
    } else if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Invalid reference';
    } else if (err.code === '22P02') { // PostgreSQL invalid text representation
        statusCode = 400;
        message = 'Invalid data format';
    }

    // Don't leak error details in production
    const response = {
        error: message
    };

    if (process.env.NODE_ENV === 'development') {
        response.details = err.message;
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not found',
        path: req.url,
        method: req.method
    });
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
