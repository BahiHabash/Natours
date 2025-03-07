const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const multer = require('multer');
const path = require('path');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controlers/errorControler');

/* --------------------------------------------------- */

const app = express();

// 1. Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Set security HTTP headers
app.use(helmet());

// NoSQL query injection and HMTL data sanitization
app.use(mongoSanitize());
app.use(xss());

// Create Req-Limit for every IP (network ip)
const limiter = rateLimit({
    max: (req, res) => req?.user?.role === 'admin' ? 300 : 100,
    windowMs: 60 * 60 * 1000, 
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again in an hour!',
    }
});
app.use('/api', limiter);

// Headers Parameters Pollution 
app.use(
    hpp({
        whitelist: [
            'duration', 'difficulty', 'ratingsAverage', 'ratingsQuantity', 'duration', 'maxGroupSize', 'price'
        ]
    })
); 

// Logs request details for debugging and monitoring
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));  
}

// serving static files
app.use(express.static(`${__dirname}/public`));



/* -------------------------------------- */

// Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) =>
    next( new AppError(`Can't found ${req.originalUrl} on this server`, 404) )
);

app.use(globalErrorHandler);

// Start The Server
module.exports = app;