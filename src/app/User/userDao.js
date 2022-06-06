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

async function selectIsNickExist(connection, nickname) {
    const selectIsNickExistQuery = `
        SELECT EXISTS(SELECT nickName FROM User WHERE nickName = ? AND isWithdraw = 'N') AS isNickExist;
    `;
    const [selectIsNickExistRow] = await connection.query(selectIsNickExistQuery, nickname);
    return selectIsNickExistRow;
}

async function insertNewUser(connection, [email, profileImgUrl, kakaoId, age, gender, nickName]) {
    const insertNewUserQuery = `
        INSERT INTO User(email, profileImgUrl, kakaoId, ageGroup, gender, nickName)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    await connection.query(insertNewUserQuery, [email, profileImgUrl, kakaoId, age, gender, nickName]);
}

async function selectUserInfoByKakaoId(connection, kakaoId) {
    const selectUserInfoByKakaoIdQuery = `
        SELECT idx AS userIdx, email, nickName, profileImgUrl, kakaoId, ageGroup, gender
        FROM User
        WHERE User.kakaoId = ? AND User.isWithdraw = 'N';   
    `;
    const [selectUserInfoByKakaoIdRow] = await connection.query(selectUserInfoByKakaoIdQuery, kakaoId);
    return selectUserInfoByKakaoIdRow;
}

module.exports = {
    selectIsUserWithdraw,
    selectIsKakaoIdExist,
    selectUserIdByKakaoId,
    selectUserInfoByUserIdx,
    selectIsNickExist,
    insertNewUser,
    selectUserInfoByKakaoId
}