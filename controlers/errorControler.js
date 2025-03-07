const AppError = require('./../utils/appError');

const handleCastErrorDB = (error) => {
    const message = `Invalid ${error.path}: ${error.value}.`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = (error) => {
    const errorsMessages = Object.values(error.errors).map(err => err).join(', ');
    return new AppError(errorsMessages, 400);
};

const handleDuplicateFieldsDB = (error) => {
    console.log(error)
    const [key, value] = Object.entries(error.keyValue)[0];
    return new AppError(`"${key}" field is duplicated with the value: ${value}, plz change the value`, 400);
}

const handleJWTError = () => {
    return new AppError('Invalid token, plz log in again', 401);
};

const handleJWTtokenExpired = () => {
    return new AppError('Token has expired, plz log in again!', 401);
};

const sendDevError = (res, err) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack
    });
};

const sendProdError = (res, err) => {
    // Operational error
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        // Log error details to the console for troubleshooting
        console.error('Error 💣💥', err);

        // Generic message for client
        res.status(500).json({
            status: 'error',
            message: 'An unknown error occurred.'
        });
    }
};

module.exports = (err, req, res, next) => {
    // Set default values if not already set
    err.statusCode ??= 500;
    err.status ??= 'error';

    
    // Check environment and send appropriate error response
    if (process.env.NODE_ENV === 'development') {
        sendDevError(res, err);
    } else if (process.env.NODE_ENV === 'production') {
        let error = Object.assign({}, err);

        if (err.name === 'CastError') {
            error = handleCastErrorDB(error);
        } else if (err.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        } else if (err.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        } else if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        } else if (err.name === 'TokenExpiredError') {
            error = handleJWTtokenExpired();
        }

        sendProdError(res, error);
    }
};
