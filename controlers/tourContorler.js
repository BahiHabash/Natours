const sharp = require('sharp');
const multer = require('multer');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const Tour = require('../models/tourModel');



exports.creatTour = factory.create(Tour);
exports.getTour = factory.getOne(Tour, 'reviews');
exports.getAllTours = factory.getAll(Tour);
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour);


// read statistics about tours
exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([  // return aggregation object
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        }, 
        { 
            $group:  {
                _id: { $toUpper: '$difficulty' },
                toursNum: { $sum: 1 },
                ratingsNum: { $sum: '$ratingsQuantity' },
                ratingsAverage: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        {
            $sort: { avgPrice: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = +req.params.year;
    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                $expr: {
                    $eq: [{ $year: '$startDates' }, year]
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStart: { $sum: 1 },
                tours: { $push: '$name' }
            }
        }, 
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: { numTourStart: -1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: plan.length,
        data: {
            plan
        }
    })
});

exports.aliesTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.fields = 'name,price,difficulty,summary';
    req.query.sort = '-ratingsAverage,price';
    next();
}

exports.getTourWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;

    const [lat, lng] = latlng.split(',');

    if (!distance || !lat || !lng) {
        next( new AppError(`you should provide the distance and lat and lng.`, 400) );
    }

    // convert distance to randian (mongo specific type)
    const radius = distance / (unit === 'mile' ? 3963.2 : 6378.1 );
    
    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            tours
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    const multiplier = unit === 'mile' ? 0.00062137 : 0.001;

    if (!lat || !lng) {
        next(new AppError(`you should provide the distance and lat and lng.`, 400));
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: { 
                    type: "Point", 
                    coordinates: [+lng, +lat] 
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: distances.length,
        data: {
            distances
        }
    });
});


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('only images allowed to be uploaded.', 400), false);
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
    {name: 'imageCover', maxCount: 1},
    {name: 'images', maxCount: 3}
], multerFilter);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // resize tour's imageCover if existed
    if (req.files?.imageCover) {
        req.body.imageCover  = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

        await sharp(req.files.imageCover[0].buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`${__dirname}/../public/img/tours/${req.body.imageCover}`);
    }

    // resize tour's images if existed
    if (req.files?.images) {
        req.body.images = [];

        await Promise.all( 
            req.files.images.map( async (file, i) => {
                file.filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

                await sharp(file.buffer)
                    .resize(2000, 1333)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toFile(`${__dirname}/../public/img/tours/${file.filename}`)

                req.body.images.push(file.filename);
            })
        );
    }

    next();
});

