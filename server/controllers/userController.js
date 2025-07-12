const passport = require('passport');

// 구글 로그인 시작
exports.googleLogin = passport.authenticate('google', {
    scope: ['profile', 'email']
});

exports.googleCallback = passport.authenticate('google', {
    failureRedirect: '/login.html', // 로그인 실패 시 리디렉션될 경로
    successRedirect: '/lobby.html' // 로그인 성공 시 리디렉션될 경로
});

// 로그아웃
exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
};