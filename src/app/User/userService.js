const userProvider = require("./userProvider");
const userDao = require('./userDao');
const secret_key = require('../../../config/secret');
const {errResponse, response} = require("../../../config/response");
const baseResponse = require("../../../config/baseResponseStatus");
const {logger} = require("../../../config/winston");
const {pool} = require("../../../config/database");
const jwt = require("jsonwebtoken");

// 회원 가입
exports.createUser = async (
    email, profileImgUrl, kakaoId,
    ageGroup, gender, nickName
) => {
    let age_arr, age;
    const connection = await pool.getConnection(async conn => conn);

    try {
        /* Validation */
        // 회원가입을 이미 한 유저인지 체크하기
        const isAlreadySignUp = await userProvider.retrieveKakaoIdCheck(kakaoId);
        if (isAlreadySignUp)
            return errResponse(baseResponse.USER_ALREADY_SIGNUP);

        if (ageGroup) {   // ageGroup이 정상적으로 전달될 때
            age_arr = ageGroup.split('~');
            if (age_arr[0] === '0') age = '10대 미만';
            else age = `${String(age_arr[0])}대`;
        }

        await userDao.insertNewUser(connection, [email, profileImgUrl, kakaoId, age, gender, nickName]);
        const newUserIdx = await userProvider.retrieveUserIdByKakaoId(kakaoId);

        // jwt 토큰 생성
        let token = await jwt.sign(
            {  // 토큰의 내용 (payload)
                userIdx: newUserIdx
            },
            secret_key.jwtsecret,   // 비밀키
            {
                expiresIn: "30d",
                subject: "userInfo",
            }
        );

        logger.info(`[Sign-Up API] New UserIdx: ${newUserIdx}`);
        return response(baseResponse.SIGN_UP_SUCCESS, { 'userIdx': newUserIdx, 'jwt': token });
    } catch(err) {
        logger.error(`App - createUser Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};