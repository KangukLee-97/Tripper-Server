async function selectIsUserWithdraw(connection, userIdx) {
    const selectUserWithdrawQuery = `
    SELECT isWithdraw
    FROM User
    WHERE User.idx = ?;
  `;
    const [selectUserWithdrawRow] = await connection.query(selectUserWithdrawQuery, userIdx);
    return selectUserWithdrawRow;
}

async function selectIsKakaoIdExist(connection, kakaoId) {
    const selectKakaoIdExistQuery = `
    SELECT EXISTS(SELECT kakaoId FROM User WHERE kakaoId = ?) AS isKakaoIdExist;
  `;
    const [kakaoIdExistRow] = await connection.query(selectKakaoIdExistQuery, kakaoId);
    return kakaoIdExistRow;
}

async function selectUserIdByKakaoId(connection, kakaoId) {
    const selectUserIdByKakaoIdQuery = `
        SELECT idx AS userIdx
        FROM User
        WHERE User.kakaoId = ? AND User.isWithdraw = 'N';
  `;
    const [selectUserIdByKakaoIdRow] = await connection.query(selectUserIdByKakaoIdQuery, kakaoId);
    return selectUserIdByKakaoIdRow;
}

async function selectUserInfoByUserIdx(connection, userIdx) {
    const selectUserInfoByUserIdxQuery = `
        SELECT idx AS userIdx, email, nickName, profileImgUrl, kakaoId, ageGroup, gender
        FROM User
        WHERE User.idx = ? AND User.isWithdraw = 'N'; 
    `;
    const [selectUserInfoByUserIdxRow] = await connection.query(selectUserInfoByUserIdxQuery, userIdx);
    return selectUserInfoByUserIdxRow;
}

module.exports = {
    selectIsUserWithdraw,
    selectIsKakaoIdExist,
    selectUserIdByKakaoId,
    selectUserInfoByUserIdx
}