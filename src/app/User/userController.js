const { response, errResponse } = require("../../../config/response");
const { logger } = require("../../../config/winston");
const baseResponse = require("../../../config/baseResponseStatus");
const secret_key = require('../../../config/secret');
const s3_multer = require('../../../config/aws_s3/multer');
const regex = require('../../../config/regex/regex');
const userService = require('./userService');
const { checkNickFword } = require('../../../config/regex/fword/fword_regex');
const userProvider = require('./userProvider');
const jwt = require("jsonwebtoken");
const axios = require("axios");
// const passport = require("passport");
// const KakaoStrategy = require("passport-kakao").Strategy

// passport.use('kakao-login', new KakaoStrategy({
//     clientID: secret_key.KAKAO_REST_KEY,
//     callbackURL: 'http://localhost:3000/auth/kakao/callback',
// }, async (accessToken, refreshToken, profile, done) => {
//     console.log("Access token: " + accessToken);
//     console.log(profile);
// }));

/**
 * API U1: 카카오 로그인 API
 * [POST] /app/users/kakao-login
 * body: accessToken
 */
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

/**
 * API U2: 회원가입 API
 * [POST] /app/users/sign-up
 * Body: email, profileImgUrl, kakaoId, ageGroup, gender, nickName
 */
exports.signUp = async (req, res) => {
    // Request 변수
    let { email, profileImgUrl, kakaoId, ageGroup, gender, nickName } = req.body;

    /* Validation */
    if (!email)   // 이메일이 없으면
        return res.send(errResponse(baseResponse.EMAIL_EMPTY));
    if (!profileImgUrl)   // 프로필 사진 링크가 없으면
        return res.send(errResponse(baseResponse.PROFILE_IMG_EMPTY));
    if (!kakaoId)   // 카카오id가 없으면
        return res.send(errResponse(baseResponse.KAKAO_ID_EMPTY));
    if (!nickName)   // 닉네임이 없으면
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!(regex.regex_nickname.test(nickName)) || nickName.length > 10 || nickName.length < 2)   // 닉네임 길이, 규칙 (한글,영어,숫자 포함 2자 이상 10자 이내)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));
    if (checkNickFword(nickName))   // 닉네임에 부적절한 내용 포함되어 있는지
        return res.send(errResponse(baseResponse.NICKNAME_BAD_WORD));

    const signUpResponse = await userService.createUser(email, profileImgUrl, kakaoId, ageGroup, gender, nickName);
    const signUpUserInfo = (await userProvider.retrieveUserInfoByKakaoId(kakaoId))[0];

    if (signUpResponse.code === 3002) {
        logger.error(`[Sign-Up API] Already exist! (kakaoId: ${kakaoId})`);
        return res.send(response(baseResponse.SIGN_UP_DUPLICATE, signUpUserInfo));
    } else {
        return res.send(response(baseResponse.SIGN_UP_SUCCESS, { 'token': signUpResponse.result, 'userInfo': signUpUserInfo }));
    }
};

/**
 * API U3: 닉네임 확인 API
 * [GET] /app/users/nickname-check
 * query string: nickname
 */
exports.checkNickname = async (req, res) => {
    const nickName = req.query.nickname;

    /* Validation */
    if (!nickName)   // 닉네임 입력 유무 체크
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!(regex.regex_nickname.test(nickName)) || nickName.length > 10 || nickName.length < 2)   // 닉네임 길이, 규칙 (한글,영어,숫자 포함 2자 이상 10자 이내)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));
    if (checkNickFword(nickName))   // 닉네임에 부적절한 내용 포함되어 있는지
        return res.send(errResponse(baseResponse.NICKNAME_BAD_WORD));

    const isNicknameDuplicate = await userProvider.retrieveNickCheck(nickName);   // 닉네임 중복 체크
    if (isNicknameDuplicate === 1)
        return res.send(errResponse(baseResponse.REDUNDANT_NICKNAME));
    else
        return res.send(response(baseResponse.NICKNAME_CHECK_SUCCESS));
};

/**
 * API U4: 자동로그인 API
 * [GET] /app/users/auto-login
 * headers: JWT Token (x-access-token)
 */
exports.autoLogin = async (req, res) => {
    const userIdFromJWT = req.verifiedToken.userIdx;
    logger.info(`[Auto-Login API] userIdx: ${userIdFromJWT}`);
    return res.send(response(baseResponse.AUTO_LOGIN_SUCCESS));
};

/**
 * API U5: 회원탈퇴 API
 * [PATCH] /app/users/withdraw
 * headers: JWT Token (x-access-token), accesstoken (kakao)
 */
exports.kakaoUnlink = async (req, res) => {
    const myIdx = req.verifiedToken.userIdx;
    const accessToken = req.headers.accesstoken;

    const myStatus = await userProvider.retrieveUserWithdrawCheck(myIdx);

    /* Validation */
    if (!accessToken)
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_EMPTY));
    if (myStatus === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    // 카카오와 연결끊기 진행 -> 클라이언트에서 JWT 삭제
    try {
        await axios({
            method: 'POST',
            url: 'https://kapi.kakao.com/v1/user/unlink',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    // DB에서 status 바꿔주기
    const updateUserStatusResult = await userService.updateUserWithdraw(myIdx);
    logger.info(`[WITHDRAW API] Withdraw User: ${myIdx}`);
    return res.send(updateUserStatusResult);
};

/**
 * API FW1: 팔로우 API
 * [POST] /app/users/follow
 * headers: JWT Token (x-access-token)
 * body: toIdx
 */
exports.followUser = async (req, res) => {
    const myIdx = req.verifiedToken.userIdx;   // 본인 인덱스
    const toIdx = req.body.toIdx;   // 팔로우 요청받는 사람의 인덱스

    if (!toIdx)   // 팔로우 요청 받는 사람의 idx가 없음
        return res.send(errResponse(baseResponse.FOLLOW_TOIDX_EMPTY));
    if (myIdx === toIdx)   // 팔로우 요청과 팔로우 요청 받는 사람의 idx가 같으면 안됨!
        return res.send(errResponse(baseResponse.FOLLOW_IDX_NOT_MATCH));

    const followUserResponse = await userService.createNewFollow(myIdx, toIdx);
    return res.send(followUserResponse);
};

/**
 * API FW2: 팔로잉/팔로워 조회 API
 * [GET] /app/users/:userIdx/follow-list
 * headers: JWT Token (x-access-token)
 * params: userIdx
 * query string: option (following/follower)
 */
exports.followList = async (req, res) => {
    const myIdx = req.verifiedToken.userIdx;
    const userIdx = req.params.userIdx;
    const option = req.query.option;

    const isUserExist = await userProvider.retrieveUserExistCheck(userIdx);
    const myStatus = await userProvider.retrieveUserWithdrawCheck(myIdx);
    const otherStatus = await userProvider.retrieveUserWithdrawCheck(userIdx);

    /* Validation */
    if (!option)   // option을 입력 안했을 경우
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_EMPTY));
    if (option !== 'following' && option !== 'follower')   // following또는 follower 입력 안했을경우
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_ERROR));
    if (!userIdx)   // 사용자 인덱스 입력 안했을 경우
        return res.send(errResponse(baseResponse.USER_IDX_EMPTY));
    if (!isUserExist)   // 존재하지 않는 유저라면
        return res.send(errResponse(baseResponse.NOT_EXIST_USER));
    if (myStatus === 'Y' || otherStatus === 'Y')   // 탈퇴한 유저 파악
        return errResponse(baseResponse.USER_WITHDRAW);


    /* Logic 진행 */
    if (parseInt(userIdx) === parseInt(myIdx)) {   // userIdx와 myIdx가 같다면 본인 팔로잉/팔로워 조회
        const getMyFollowList = await userProvider.retrieveUserFollowList(myIdx, 'Y', option);
        if (getMyFollowList.length === 0) {
            if (option === 'following')
                return res.send(errResponse(baseResponse.FOLLOWING_SEARCH_NOT_RESULT));
            else if (option === 'follower')
                return res.send(errResponse(baseResponse.FOLLOWER_SEARCH_NOT_RESULT));
        } else {
            if (option === 'following')
                return res.send(response(baseResponse.FOLLOWING_LIST_SUCCESS, getMyFollowList));
            else if (option === 'follower')
                return res.send(response(baseResponse.FOLLOWER_LIST_SUCCESS, getMyFollowList));
        }
    }
    else {   // 다르면 상대방의 팔로잉, 팔로워 조회
        const getOtherFollowList = await userProvider.retrieveUserFollowList([userIdx, myIdx], 'N', option);
        if (getOtherFollowList.length === 0) {
            if (option === 'following')
                return res.send(errResponse(baseResponse.FOLLOWING_SEARCH_NOT_RESULT));
            else if (option === 'follower')
                return res.send(errResponse(baseResponse.FOLLOWER_SEARCH_NOT_RESULT));
        } else {
            if (option === 'following')
                return res.send(response(baseResponse.FOLLOWING_LIST_SUCCESS, getOtherFollowList));
            else if (option === 'follower')
                return res.send(response(baseResponse.FOLLOWER_LIST_SUCCESS, getOtherFollowList));
        }
    }
};