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

// 팔로우
exports.createNewFollow = async (myIdx, toIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        /* Validation */
        // 실제로 존재하는 사용자인지 확인하기 (회원탈퇴, 잘못된 인덱스) + 자신은 할필요 없음
        const isUserExist = (await userDao.selectIsUserExist(connection, toIdx))[0].isUserExist;
        if (!isUserExist)
            return errResponse(baseResponse.NOT_EXIST_USER);

        // 회원 탈퇴 유무 체크하기
        const myStatus = (await userDao.selectIsUserWithdraw(connection, myIdx))[0].isWithdraw;
        const otherStatus = (await userDao.selectIsUserWithdraw(connection, toIdx))[0].isWithdraw;
        if (myStatus === 'Y' || otherStatus === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 팔로우 상태에 따라 나누기
        const followStatusResult = await userDao.selectUserFollowStatus(connection, [myIdx, toIdx]);
        if (followStatusResult.length === 0 || followStatusResult[0].status === 'N') {   // (1) 서로 팔로우가 아예 안되어있거나 한번 요청했다가 끊은 경우
            if (followStatusResult.length === 0)    // 처음 팔로우
                await userDao.insertNewFollow(connection, [myIdx, toIdx]);
            else   // 한번 팔로우를 해봤음
                await userDao.updateFollow(connection, ['Y', myIdx, toIdx])

            logger.info(`[Follow API] Follow Success! (${myIdx} -> ${toIdx})`);
            return response(baseResponse.FOLLOW_SUCCESS);
        }
        else {   // (2) 팔로우가 서로 되어있는 상황
            await userDao.updateFollow(connection, ['N', myIdx, toIdx]);
            logger.info(`[Follow API] Unfollow Success! (${myIdx} -> ${toIdx})`);
            return response(baseResponse.UNFOLLOW_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - createNewFollow Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

// 사용자 status 바꾸기
exports.updateUserWithdraw = async (userIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        await userDao.updateUserStatusToWithdraw(connection, userIdx);
        return response(baseResponse.WITHDRAW_SUCCESS);
    } catch(err) {
        logger.error(`App - updateUserWithdraw Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};