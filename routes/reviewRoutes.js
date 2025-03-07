const express = require('express');
const authControler = require('../controlers/authControler');
const reviewControler = require('../controlers/reviewControler');

// merge nested params
const router = express.Router({ mergeParams: true });

router.use(authControler.protect);

router
    .route('/')
    .get(reviewControler.filterByTour, reviewControler.getAllReviews)
    .post(authControler.restrictTo('user'), reviewControler.setTourIdAndUserId, reviewControler.createReview);

router
    .route('/:id')
    .get(reviewControler.getReview)
    .patch(authControler.restrictTo('user', 'admin'), reviewControler.updateReview)
    .delete(authControler.restrictTo('user', 'admin'), reviewControler.deleteReview);


module.exports = router;




