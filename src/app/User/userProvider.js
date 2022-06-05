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