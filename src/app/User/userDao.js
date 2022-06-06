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

/**
 * selectIsUserExist (userIdx)
 * 실제 존재하는 사용자인지 체크
 */
async function selectIsUserExist(connection, userIdx) {
    const selectIsUserExistQuery = `
        SELECT EXISTS(SELECT idx FROM User WHERE idx = ? AND isWithdraw = 'N') AS isUserExist;    
    `;
    const [selectIsUserExistRow] = await connection.query(selectIsUserExistQuery, userIdx);
    return selectIsUserExistRow;
}

/**
 * selectUserFollowStatus (myIdx, toIdx)
 * 본인과 상대방의 팔로우 상태 조회
 */
async function selectUserFollowStatus(connection, [myIdx, toIdx]) {
    const selectUserFollowStatusQuery = `
        SELECT status
        FROM Follow
        WHERE fromIdx = ? AND toIdx = ?;
    `;
    const [selectUserFollowStatusRow] = await connection.query(selectUserFollowStatusQuery, [myIdx, toIdx]);
    return selectUserFollowStatusRow;
}

/**
 * insertNewFollow (fromIdx, toIdx)
 * 새로운 팔로우 관계 생성
 */
async function insertNewFollow(connection, [fromIdx, toIdx]) {
    const insertNewFollowQuery = `
        INSERT INTO Follow(fromIdx, toIdx)
        VALUES (?, ?);
    `;
    await connection.query(insertNewFollowQuery, [fromIdx, toIdx]);
}

/**
 * updateFollow (status, fromIdx, toIdx)
 * 팔로우 상태 업데이트
 */
async function updateFollow(connection, [status, fromIdx, toIdx]) {
    const updateFollowStatusQuery = `
        UPDATE Follow
        SET status = ?
        WHERE fromIdx = ? AND toIdx = ?;
    `;
    await connection.query(updateFollowStatusQuery, [status, fromIdx, toIdx]);
}

/**
 * selectMyFollowList (userIdx, option)
 * 내 팔로우 또는 팔로잉 리스트 조회
 */
async function selectMyFollowList(connection, [userIdx, option]) {
    let selectMyFollowListQuery = '';
    let params;

    if (option === 'following') {
        selectMyFollowListQuery = `
            SELECT toIdx, nickName, profileImgUrl,
             CASE
               WHEN Follow.status = 'Y' THEN '팔로잉 활성화중'
               WHEN Follow.status = 'N' THEN '팔로잉 비활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User
                        ON Follow.toIdx = User.idx AND User.isWithdraw = 'N'
      WHERE Follow.fromIdx = ? AND Follow.status = 'Y'
      ORDER BY Follow.createdAt;    
        `;
        params = userIdx;
    } else if (option === 'follower') {
        selectMyFollowListQuery = `
            SELECT fromIdx, nickName, profileImgUrl,
             CASE
               WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
               WHEN A.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User ON Follow.fromIdx = User.idx AND User.isWithdraw = 'N'
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
               INNER JOIN User ON Follow.toIdx = User.idx AND User.isWithdraw = 'N'
        WHERE Follow.fromIdx = ?
      ) AS A ON Follow.fromIdx = A.toIdx
      WHERE Follow.toIdx = ? AND Follow.status = 'Y'
      ORDER BY Follow.createdAt;    
        `;
        params = [userIdx, userIdx];
    }

    const [selectMyFollowListRow] = await connection.query(selectMyFollowListQuery, params);
    return selectMyFollowListRow;
}

/**
 * selectOtherFollowList (myIdx, userIdx, option)
 * 상대방 팔로우 또는 팔로잉 리스트 조회
 */
async function selectOtherFollowList(connection, [myIdx, userIdx, option]) {
    let selectOtherFollowQuery = "";
    let params;

    if (option === 'following') {
        selectOtherFollowQuery = `
      SELECT Follow.toIdx, nickName, profileImgUrl,
             CASE
               WHEN Follow.toIdx = ? THEN '자기 자신'
               WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
               WHEN A.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User ON Follow.toIdx = User.idx AND User.isWithdraw = 'N'
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
               INNER JOIN User ON Follow.toIdx = User.idx AND User.isWithdraw = 'N'
        WHERE Follow.fromIdx = ?
      ) AS A ON A.toIdx = Follow.toIdx
      WHERE Follow.fromIdx = ? AND Follow.status = 'Y'
      ORDER BY Follow.createdAt;
    `;
        params = [myIdx, myIdx, userIdx];
    } else {
        selectOtherFollowQuery = `
      SELECT Follow.fromIdx, nickName, profileImgUrl,
             CASE
               WHEN Follow.fromIdx = ? THEN '자기 자신'
               WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
               WHEN A.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User ON Follow.fromIdx = User.idx AND User.isWithdraw = 'N'
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
               INNER JOIN User ON Follow.toIdx = User.idx AND User.isWithdraw = 'N'
        WHERE Follow.fromIdx = ?
      ) AS A ON A.toIdx = Follow.fromIdx
      WHERE Follow.toIdx = ? AND Follow.status = 'Y'
      ORDER BY Follow.createdAt;
    `;

        params = [myIdx, myIdx, userIdx];
    }

    const [selectOtherFollowRow] = await connection.query(selectOtherFollowQuery, params);
    return selectOtherFollowRow;
}

/**
 * updateUserStatusToWithdraw (userIdx)
 * 사용자 status 탈퇴 상태로 바꾸기
 */
async function updateUserStatusToWithdraw(connection, userIdx) {
    const updateUserStatusToWithdrawQuery = `
        UPDATE User
        SET isWithdraw = 'Y', kakaoId = 0
        WHERE User.idx = ?;
  `;
    await connection.query(updateUserStatusToWithdrawQuery, userIdx);
}

module.exports = {
    selectIsUserWithdraw,
    selectIsKakaoIdExist,
    selectUserIdByKakaoId,
    selectUserInfoByUserIdx,
    selectIsNickExist,
    insertNewUser,
    selectUserInfoByKakaoId,
    selectIsUserExist,
    selectUserFollowStatus,
    insertNewFollow,
    updateFollow,
    selectMyFollowList,
    selectOtherFollowList,
    updateUserStatusToWithdraw
}