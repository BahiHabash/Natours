const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema({
    name: { 
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, 
      maxLength: [40, `A tour's name must have less than 40 chars`],
      minLength: [10, `A tour's name must have more than 10 chars`],
    },
    secretTour: {
      type: Boolean,
      default: false
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'], 
      enum: {
        values: ['easy', 'medium' ,'difficult'],  
        message: 'Difficulty is either: easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, 
      min: [1, `Rating must be above than 1.0`],
      max: [5, `Rating must be below than 5.0`]
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number, 
      validate: {
        validator: function(val) {
          return val < this.price;
        },
        message: `Discount price ({VALUE}) should be Below the tour's price`
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    // guides: Array // for embeding users
    guides: [
        { // for referecing users
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false
});

tourSchema.index({price: 1});
tourSchema.index({price: -1, ratingsAverage: 1});
tourSchema.index({slug: 1});
tourSchema.index({startLocation: '2dsphere'});

// virtual property
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// populating reviews (instead of child referecing)
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// populate the referenced guides
tourSchema.pre(/^find/, function(next) {
  this.populate({ 
      path: 'guides',
      select: '-__v'
  });

  next();
});

// document middleware slugify the name
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Query middleware
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms ⏱️`)
  next();
});

// Aggregation Middelware
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });


// embeding the users
// tourSchema.pre('save', async function(next) {
//   // get all guides from User database
//   const guidesPromises = this.guides.map(id => User.findById(id));
//   // embeded guides into current tour document
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);
  
module.exports = Tour;



