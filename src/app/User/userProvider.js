const { pool } = require("../../../config/database");
const userDao = require("./userDao");

// 사용자 회원탈퇴 status 확인
exports.checkUserStatus = async (myIdx) => {
    const connection = await pool.getConnection(async conn => conn);
    const checkUserStatusResult = (await userDao.selectIsUserWithdraw(connection, myIdx))[0].isWithdraw;
    connection.release();
    return checkUserStatusResult;
};

// kakaoId 존재하는지 체크
exports.retrieveKakaoIdCheck = async (kakaoId) => {
    const connection = await pool.getConnection(async conn => conn);
    const retrieveKakaoIdCheckResult = (await userDao.selectIsKakaoIdExist(connection, kakaoId))[0].isKakaoIdExist;
    connection.release();
    return retrieveKakaoIdCheckResult;
};

// 카카오ID로 사용자 인덱스 가져오기
exports.retrieveUserIdByKakaoId = async (kakaoId) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const retrieveUserIdByKakaoIdResult = (await userDao.selectUserIdByKakaoId(connection, kakaoId))[0].userIdx;
    connection.release();
    return retrieveUserIdByKakaoIdResult;
};

// 사용자 idx로 정보 가져오기
exports.getUserInfoByUserIdx = async (userIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getUserInfoByUserIdxResult = await userDao.selectUserInfoByUserIdx(connection, userIdx);
    connection.release();
    return getUserInfoByUserIdxResult;
};

// 닉네임 중복 확인
exports.retrieveNickCheck = async (nickname) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const retrieveNickCheckResult = (await userDao.selectIsNickExist(connection, nickname))[0].isNickExist;
    connection.release();
    return retrieveNickCheckResult;
};

// 카카오ID로 사용자 정보 받아오기
exports.retrieveUserInfoByKakaoId = async (kakaoId) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const retrieveUserInfoByKakaoIdResult = await userDao.selectUserInfoByKakaoId(connection, kakaoId);
    connection.release();
    return retrieveUserInfoByKakaoIdResult;
};

// 실제로 사용자가 존재하는지 체크
exports.retrieveUserExistCheck = async (userIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const retrieveUserExistCheckResult = (await userDao.selectIsUserExist(connection, userIdx))[0].isUserExist;
    connection.release();
    return retrieveUserExistCheckResult;
};

// 탈퇴한 유저인지 체크
exports.retrieveUserWithdrawCheck = async (userIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const retrieveUserWithdrawCheckResult = (await userDao.selectIsUserWithdraw(connection, userIdx))[0].isWithdraw;
    connection.release();
    return retrieveUserWithdrawCheckResult;
};

// 사용자 팔로워, 팔로잉 리스트 조회
exports.retrieveUserFollowList = async (userIdx, isMe, search_option) => {
    const connection = await pool.getConnection(async (conn) => conn);

    if (isMe === 'Y') {   // 본인일 경우
        const myFollowListResult = await userDao.selectMyFollowList(connection, [userIdx, search_option]);
        connection.release();
        return myFollowListResult;
    }
    else {   // 상대방일 경우
        const otherFollowListResult = await userDao.selectOtherFollowList(connection, [userIdx[1], userIdx[0], search_option]);
        connection.release();
        return otherFollowListResult;
    }
};