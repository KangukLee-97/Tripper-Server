const { pool } = require("../../../config/database");
const userDao = require("./userDao");

exports.checkUserStatus = async (myIdx) => {
    const connection = await pool.getConnection(async conn => conn);
    const checkUserStatusResult = (await userDao.selectIsUserWithdraw(connection, myIdx))[0].isWithdraw;
    connection.release();
    return checkUserStatusResult;
};