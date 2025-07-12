const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// /google 경로 처리
router.get('/google', userController.googleLogin);

// 구글 로그인 성공 후 롤백
router.get('google/callback', userController.googleCallback);

// 로그아웃
router.get('/logout', userController.logout);

module.exports = router;