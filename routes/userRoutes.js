const express = require('express');
const authControler = require('../controlers/authControler');
const userContorler = require('../controlers/userContorler');

const router = express.Router();

router 
  .post('/signup', authControler.signup)
  .post('/login', authControler.login)
  .post('/forgotPassword', authControler.forgotPassword)
  .patch('/resetPassword/:token', authControler.resetPassword);


// protect all routes after this middleware
router.use(authControler.protect);

router.get('/me', userContorler.getMe, userContorler.getUser);
router.patch('/updateMyPassword', authControler.updatePassword);
router.delete('/deleteMe', userContorler.deleteMe);
router
  .patch('/updateMe'
    , userContorler.uploadUserPhoto
    , userContorler.resizeUserPhoto
    , userContorler.updateMe
  );

router.use(authControler.restrictTo('admin'));

router
  .route('/')
  .get(userContorler.getAllUsers)
  .post(userContorler.creatUser);

router
  .route('/:id')
  .get(userContorler.getUser)
  .delete(userContorler.deleteUser)
  .patch(userContorler.restricFields('name', 'email'), userContorler.updateUser);

module.exports = router;

