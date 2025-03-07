const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');


exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
        next(new AppError(`No such a tour with that id ${req.params.tourId}`, 400));
    }

    // create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        // not secure at all
        success_url: `${req.protocol}://${req.get('host')}/tours/?tour=${req.params.tourId}&user=${req.user._id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${tour.name} Tour`,
                description: tour.summary,
                images: [`https://www.natours.dev/img/tours/${tour.imageCover}`]
              },
              unit_amount: tour.price * 100
            },
            quantity: 1
          }
        ],
        mode: 'payment'
    });

    // send session as response
    res.status(200).json({
        status: 'success', 
        data: {
            session
        }
    });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    const { tour, user, price } = req.query;

    if (! (tour && user && price)) return next();

    await Booking.create({ tour, user, price });

    res.redirect(req.originalUrl.split('?')[0]);
});




exports.getAllBookings = factory.getAll('Booking');
exports.createBooking = factory.create('Booking');
exports.getBooking = factory.getOne('Booking', 'user');
exports.updateBooking = factory.updateOne('Booking');
exports.deleteBooking = factory.deleteOne('Booking');






