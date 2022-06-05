async function selectIsUserWithdraw(connection, userIdx) {
    const selectUserWithdrawQuery = `
    SELECT isWithdraw
    FROM User
    WHERE User.idx = ?;
  `;
    const [selectUserWithdrawRow] = await connection.query(selectUserWithdrawQuery, userIdx);
    return selectUserWithdrawRow;
}

module.exports = {
    selectIsUserWithdraw,
}