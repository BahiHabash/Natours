const dotenv = require('dotenv');

dotenv.config({ path: '../config.env' });

const util = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/mail');

/* ------------------------------------------------ */

// generate sign token
const signToken = function(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const creatAndSendToken = function(user, statusCode, res) {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ), 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production'
    }
    
    // send JWT token via cookie
    res.cookie('jwt', token, cookieOptions);

    // Don't send password to the client
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        data: {
            user
        }
    });
}

exports.signup = catchAsync(async (req, res, next) => {
    // const newUser = await User.create(req.body); // any one can signup as an admin
    let newUser = await User.create({
        name: req.body.name, 
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });

    const ALLOWED_INFO = ['role', 'name', 'email', '_id', 'photo'];

    const user = {};
    ALLOWED_INFO.forEach(field => user[field] = newUser[field]);

    // send hello to singed up users
    const homePageUrl = process.env.NODE_ENV === 'development' ? `${req.protocol}://${req.get('host')}/me` :  process.env.HOME_PAGE_URL;
    const email = new Email(user, homePageUrl);
    email.sendWelcome('Welcom to natours.io');

    creatAndSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // check if email and password are valid
    if (!email || !password) {
        return next(new AppError(`Plz provide email and password`, 400));
    }

    // check if user existed and password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.isPasswordCorrect(password, user.password))) {
        return next(new AppError(`Invalid Email or Password`, 401));
    }

    // log in
    creatAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    // Check if there is a token
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ').at(1);
    }

    if (!token) {
        return next(new AppError('You are not logged in, plz log in to get access', 401));
    }
    
    // Token verification
    const decoded = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Check if the user is still existed
    const freshUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!freshUser) {
        return next(new AppError('User belongs this token no longer existed !', 401));
    }

    // Check if the password wasn't changed after the token was issued
    if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed the password, plz log in againg !', 401));
    }
    
    // GRANT access to protected routes
    req.user = freshUser; // attack fresh user to the request
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('you do not have permission to perform this action', 403));
        }

        next();
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with email address.', 404));
    }
  
    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
  
    // 3) Send it to user's email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        const subject = 'Your password reset token (valid for 10 min)';
        const message = `Your password reset token`;
        
        const email = new Email(user, resetURL);
        await email.sendResetToken(subject, message);
  
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;
        await user.save({ validateBeforeSave: false });

        const errMessage = process.env.NODE_ENV == 'development' ? err.message : 'There was an error sending the email. Try again later!';
        
        return next( new AppError(errMessage, 500) );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token 
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetTokenExpires: { $gt: Date.now() } });

    // Check if user existed and token hasn't expired
    if (!user) {
        return next(new AppError(`Invalid or Expired reset password token`, 401));
    }

    // update password and changePasswordAt
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    
    await user.save();

    // Log the user and send JWT
    creatAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // get the user 
    const user = await User.findById(req.user._id).select('+password');

    // check if the POSTed current password is correct
    if (!await user.isPasswordCorrect(req.body.passwordCurrent, user.password)) {
        return next(new AppError(`Password is not correct`, 401));
    }

    // update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // log the user in and send the jwt
    creatAndSendToken(user, 200, res);
});