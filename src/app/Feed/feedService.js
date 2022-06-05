const { logger } = require("../../../config/winston");
const { pool } = require('../../../config/database');
const { response, errResponse } = require("../../../config/response");
const baseResponse = require("../../../config/baseResponseStatus");
const feedDao = require("./feedDao");

// 게시물 작성 Service
exports.createNewFeed = async (
    myIdx, startDate, endDate, traffic, title,
    introduce, hashtagArr, thumnails, day, dateDiff
) => {
    const connection = await pool.getConnection(async (conn) => conn);
    let travelIdx, dayIdxArr, dayAreaIdx, tagIdx;

    try {
        // 1. Travel 테이블에 값을 넣어서 travelIdx 생성
        await feedDao.insertNewFeed(connection, [myIdx, title, introduce, traffic, startDate, endDate]);

        // 2. 새로 생성한 게시물에 대한 travelIdx 가져오기
        travelIdx = (await feedDao.selectFeedIdxByAll(connection, [myIdx, title, traffic, startDate, endDate]))[0].idx;

        // 3. Day 테이블에 row 생성
        for (let i=1; i<=dateDiff; i++) {
            await feedDao.insertFeedDay(connection, [travelIdx, i]);
        }

        // 4. 새로 생성한 dayIdx에 대해서 가져오기
        dayIdxArr = await feedDao.selectFeedDayIdx(connection, travelIdx);

        // 5. day에 입력된 데이터들을 dayIdx를 가지고 DB에 insert
        for (let i=0; i<dayIdxArr.length; i++) {
            let areaArr = day[i].area;
            if (areaArr) {  // area를 입력했다면
                if (areaArr.length) {

                }
            }
        }
    } catch(err) {
        logger.error(`App - createNewFeed Service Error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};