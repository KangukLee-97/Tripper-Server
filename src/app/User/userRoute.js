module.exports = function (app) {
    const user = require('./userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    // const s3_multer = require('../../../config/aws_s3/multer');
    // const passport = require('passport');

    // U1. 카카오 로그인 API
    app.post('/app/users/kakao-login', user.kakaoLogin);
    // app.get('/kakao', passport.authenticate('kakao-login'));
    // // 위에서 카카오 서버로 로그인이 되면 카카오 Redirect URL을 통해 이쪽 라우터로 오게 된다.
    // app.get('/auth/kakao/callback', passport.authenticate('kakao-login', {
    //     failureRedirect : '/',   // kakaoStrategy에서 실패한다면 실행
    // }), (req, res) => { res.redirect('/'); });   // 성공한다면 콜백 실행

    // U2
    // U3. 닉네임 확인 API
    app.get('/app/users/nickname-check', user.checkNickname);

    // U4. 자동로그인 API
    app.get('/app/users/auto-login', jwtMiddleware, user.autoLogin);
};