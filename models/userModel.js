const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const validator = require('validator');


const userSchema = new mongoose.Schema(
    {
        name: {
            type: String, 
            minLength: [5, 'name must be at least 5 chars'],
            maxLength: [15, 'name must be at most 15 chars'],
            trim: true,
            required: [true, 'Plz tell us your name.'],
        },
        email: {
            type: String,
            lowwercase: true,
            trim: true,
            unique: true,
            required: [true, 'Plz provide your email.'],
            validate: [validator.isEmail, 'Plz enter a valid email.'],
        },
        photo: {
            type: String,
            default: 'default.jpg'
        },
        password: {
            type: String, 
            required: [true, 'Plz provide a password'],
            minLength: [8, 'Password must be at least 8 chars.'], 
            select: false
        },
        passwordConfirm: {
            type: String, 
            required: [true, 'Plz confirm you password.'],
            validate: {
                // ONLY work on creating new object (save actions)
                validator : function(val) {
                    return val === this.password;
                }, 
                message: `The password and its confirmation doesn't match`
            }
        },
        passwordChangedAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        role : {
            type: String,
            enum: ['user', 'guide', 'lead-guide','admin'],
            default: 'user'
        },
        passwordResetToken: String,
        passwordResetTokenExpires: Date,
        active: {
            type: Boolean,
            default: true,
            select: false
        }
    }, 
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        id: false
    }
);


// don'e select non-active users
userSchema.pre(/^find/, function(next) {
    this.find({ active : {$ne: false} });
    next();
});

// update passwordChaned time
userSchema.pre(/^save/, function(next) {
    if (this.isModified('password') && !this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
    }

    next();
});

// encrypt password 
userSchema.pre(/^save/, async function(next) {
    if (this.isModified('password')) {
        // Hash the password
        this.password = await bcrypt.hash(this.password, 12);
        // Delete confirmed password
        this.passwordConfirm = undefined;
    }

    next();
});

// check if password is correct
userSchema.methods.isPasswordCorrect = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// check if jwt is created after changing password 
userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const passwordChangingTimeStamp = this.passwordChangedAt.getTime() / 1000;
        return +JWTTimeStamp < +passwordChangingTimeStamp;
    }
    
    return false;
};

// Generate random token for password reset
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};


const User = mongoose.model('User', userSchema);

module.exports = User;
