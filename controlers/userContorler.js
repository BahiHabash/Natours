const sharp = require('sharp');
const multer = require('multer');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.creatUser = factory.create(User);
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User);


// restrict fields and clean request body before updating user
exports.restricFields = (...allowedFields) => catchAsync(async (req, res, next) => {
    // Creat error if user tried to update pssword
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError(`This route not for updating password, you can user /updateMyPassword instead.`, 400));
    }
    
    // filter updated data
    const filteredBody = {};
    allowedFields.forEach(field => { filteredBody[field] = req.body[field] });
    req.body = filteredBody;

    next();
}); 

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success', 
        data : null
    });
});

// get current loged-in user
exports.getMe = (req, res, next) => {
    req.params.id = req.user._id;
    next();
}


// multer configerations
const multerStorage = multer.memoryStorage();

const multiFilter = function(req, file, cb) {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Only images are uploaded.', 404));    
    }
}

const upload = multer({ 
    storage: multerStorage,
    fileFilter: multiFilter
});

exports.uploadUserPhoto = upload.single('photo');


exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (req.file) {
        req.file.filename = `user-${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpeg`;

        await sharp(req.file.buffer)
            .resize(500, 500)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`${__dirname}/../public/img/users/${req.file.filename}`);
    }

    next();
});


// filter request body (keep only allowed fields to be modified)
function filterBody(obj) {
    const ALLOWED_FIELDS = ['name', 'email', 'photo'];
    const newObj = {};
    ALLOWED_FIELDS.forEach(field => { newObj[field] = obj[field] });
    return newObj;
}


exports.updateMe = catchAsync(async (req, res, next) => {
    // clean and limit the updated info
    req.body = filterBody(req.body);

    // add photo to the body to update it in the db
    if (req.file) req.body.photo = req.file.filename;

    // update the current user 
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
        new: true,
        upsert: true,
        runValidators: true
    });
    
    // send response back
    res.status(200).json({
        status: 'success', 
        data: {
            user
        }
    });
});
