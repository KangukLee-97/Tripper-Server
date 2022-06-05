const { response, errResponse } = require("../../../config/response");
const { logger } = require("../../../config/winston");
const baseResponse = require("../../../config/baseResponseStatus");
const secret_key = require('../../../config/secret');
const s3_multer = require('../../../config/aws_s3/multer');
const userProvider = require('./userProvider');
const jwt = require("jsonwebtoken");
const axios = require("axios");
// const passport = require("passport");
// const KakaoStrategy = require("passport-kakao").Strategy

/**
 * API U1: 카카오 로그인 API
 * [POST] /app/users/kakao-login
 * body: accessToken
 */
// passport.use('kakao-login', new KakaoStrategy({
//     clientID: secret_key.KAKAO_REST_KEY,
//     callbackURL: 'http://localhost:3000/auth/kakao/callback',
// }, async (accessToken, refreshToken, profile, done) => {
//     console.log("Access token: " + accessToken);
//     console.log(profile);
// }));

exports.kakaoLogin = async (req, res) => {
    let user_kakao_profile;
    const accessToken = req.body.accessToken;

    /* Validation */
    if (!accessToken)   // 카카오 accessToken 입력 체크
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_EMPTY));

    // 프론트에서 받은 access token을 카카오 서버로 보내서 사용자 정보 가져옴
    try {
        user_kakao_profile = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    } catch(err) {   // 카카오 access token 만료 등?
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    // 카카오 서버에서 받아온 사용자 정보들
    const email = user_kakao_profile.data.kakao_account.email;   // 사용자 이메일 (카카오)
    const profileImgUrl = user_kakao_profile.data.kakao_account.profile.profile_image_url;   // 사용자 프로필 이미지 URL
    const kakaoId = String(user_kakao_profile.data.id);   // 카카오 고유ID
    let ageGroup = user_kakao_profile.data.kakao_account.age_range;   // 연령대
    let gender = user_kakao_profile.data.kakao_account.gender;   // 성별

    // 연령대 또는 성별을 체크 안했을 경우 null처리
    // if (!ageGroup) ageGroup = null;
    // if (!gender) gender = null;

    // 카카오 서버에서 온 사용자의 카카오 사진 s3에 올리기
    const s3_profileUrl = await s3_multer.kakao_image_upload(profileImgUrl);

    /**
     * 사용자의 카카오 고유번호가 DB에 존재하는지 체크할 것
     * 존재하면? -> 기존에 있던 유저 -> 바로 JWT 발급 및 로그인 처리 + 사용자 status 수정
     * 존재하지 않는다면? -> 회원가입 API 진행 (닉네임 입력 페이지)
     */
    const isKakaoExist = await userProvider.retrieveKakaoIdCheck(kakaoId);
    if (isKakaoExist) {   // 원래 있던 유저라면
        // 유저 인덱스 가져오기
        const userIdx = (await userProvider.retrieveUserIdByKakaoId(kakaoId))[0].userIdx;

        // jwt 토큰 생성
        let token = await jwt.sign(
            {  // 토큰의 내용 (payload)
                userIdx: userIdx
            },
            secret_key.jwtsecret,   // 비밀키
            {
                expiresIn: "30d",
                subject: "userInfo",
            }   // 유효기간 365일
        );

        // 로그인한 User 정보 출력
        const loginUserResult = await userProvider.getUserInfoByUserIdx(kakaoId);
        logger.info(`[Kakao Login API] login-userIdx: ${userIdx}, nickName: ${loginUserResult[0].nickName}`);
        return res.send(response(baseResponse.KAKAO_LOGIN_SUCCESS,
            {
                'userIdx': userIdx,
                'jwt': token,
                'email': loginUserResult[0].email,
                'nickName': loginUserResult[0].nickName,
                'profileImgUrl': loginUserResult[0].profileImgUrl,
                'kakaoId': loginUserResult[0].kakaoId,
                'ageGroup': loginUserResult[0].ageGroup,
                'gender': loginUserResult[0].gender
            }));
    }
    else   // 신규 유저라면
        return res.send(response(baseResponse.KAKAO_SIGN_UP, {
            'email': email,
            'profileImgUrl': s3_profileUrl.Location,
            'kakaoId': kakaoId,
            'ageGroup': ageGroup,
            'gender': gender
        }));
};