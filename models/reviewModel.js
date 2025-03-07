const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            require: [true, 'review can not be empty.']
        }, 
        rating: {
            type: Number,
            min: 1,
            max: 5,
            message: 'Rating should be between [1, 5]'
        }, 
        creatAt: {
            type: Date,
            default: Date.now()
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            require: [true, 'A review must belongs to a tour.']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            require: [true, 'A review must belongs to a user']
        }
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
        id: false
    }
);

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

// update avragerating for a tour
reviewSchema.statics.calcAvgRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId },
        },
        {    
            $group: {
                _id: '$tour',
                nRatings: { $sum: 1 },
                avgRatings: { $avg: '$rating' }
            }
        }
    ]);

    await Tour.findByIdAndUpdate(tourId, { ratingsQuantity: stats[0]?.nRatings ?? 0, ratingsAverage: stats[0]?.avgRatings ?? 0 });
}

// update avragerating for tour after posting a review
reviewSchema.post('save', function() {
    this.constructor.calcAvgRatings(this.tour);
});

// Store the document before the update or delete operation
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.review = await this.model.findOne(this.getQuery());
    next();
});

// update avragerating for tour after updating or deleting a review
reviewSchema.post(/^findOneAnd/, async function () {
    if (this.review) {
        await this.review.constructor.calcAvgRatings(this.review.tour);
    }
});

// populating user
reviewSchema.pre(/^find/, function(next) {
    this.populate({ path: 'user', select: 'name'});

    next();
});



const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;