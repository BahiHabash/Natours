const Review = require('../models/reviewModel');
const AppError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');


exports.createReview = factory.create(Review);
exports.getReview = factory.getOne(Review);
exports.getAllReviews = factory.getAll(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

// [Hack for nested routing]
exports.setTourIdAndUserId = (req, res, next) => {
    // not best practise but to the dev easy and test via postman
    req.body.tour ??= req.params.tourId;
    req.body.user ??= req.user._id;

    next();
}

// [Hack] for geting reviews on a specific tour [nested routing]
exports.filterByTour = (req, res, next) => {
    if (req.params.tourId) req.query.tour = req.params.tourId;

    next();
}