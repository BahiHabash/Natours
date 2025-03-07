const express = require('express');
const authControler = require('../controlers/authControler');
const tourControler = require('../controlers/tourContorler');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

// merge nested routes
router.use('/:tourId/reviews', reviewRoutes);


router
  .route('/stats')
  .get(tourControler.getTourStats);

router
  .route('/top-5-cheap')
  .get(tourControler.aliesTopTours, tourControler.getAllTours);

// only loged-in user are allowed to use the below routes
router.use(authControler.protect);

router
  .route('/getMonthlyPlan/:year')
  .get(authControler.restrictTo('admin', 'lead-guide', 'guide'), tourControler.getMonthlyPlan);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourControler.getTourWithin);

router
  .route('/distances/:latlng/unit/:unit')
  .get(tourControler.getDistances);

router
  .route('/')
  .get(authControler.protect, tourControler.getAllTours)
  .post(authControler.restrictTo('admin', 'lead-guide'), tourControler.creatTour);

router
  .route('/:id')
  .get(tourControler.getTour)
  .patch(
    authControler.restrictTo('admin', 'lead-guide')
    , tourControler.uploadTourImages
    , tourControler.resizeTourImages
    , tourControler.updateTour
  )
  .delete(authControler.restrictTo('admin', 'lead-guide'), tourControler.deleteTour);

module.exports = router;