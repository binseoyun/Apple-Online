const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/users/:id', userController.getUserProfile);

router.put('/users/:id/nickname', user.updateNickname);

module.exports = router;