async function insertNewFeed(connection, [myIdx, title, introduce, traffic, startDate, endDate]) {
    const insertNewFeedQuery = `
        INSERT INTO Travel(userIdx, title, introduce, traffic, startDate, endDate)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    return await connection.query(insertNewFeedQuery, [myIdx, title, introduce, traffic, startDate, endDate]);
}

async function selectFeedIdxByAll(connection, [myIdx, title, traffic, startDate, endDate]) {
    const selectFeedIdxByAllQuery = `
        SELECT MAX(idx) AS idx
        FROM Travel
        WHERE userIdx = ? AND title = ? AND traffic = ? AND startDate = ? AND endDate = ?;
    `;
    const [selectFeedIdxByAllRow] = await connection.query(selectFeedIdxByAllQuery, [myIdx, title, traffic, startDate, endDate]);
    return selectFeedIdxByAllRow;
}

async function insertFeedDay(connection, [travelIdx, idx]) {
    const insertFeedDayQuery = `
        INSERT INTO Day(travelIdx, dayNumber)
        VALUES (?, ?);
    `;
    return await connection.query(insertFeedDayQuery, [travelIdx, idx]);
}

async function selectFeedDayIdx(connection, travelIdx) {
    const selectFeedDayIdxQuery = `
        SELECT idx AS dayIdx
        FROM Day 
        WHERE travelIdx = ?;
    `;
    const [selectFeedDayIdxRow] = await connection.query(selectFeedDayIdxQuery, travelIdx);
    return selectFeedDayIdxRow;
}

module.exports = {
    insertNewFeed,
    selectFeedIdxByAll,
    insertFeedDay,
    selectFeedDayIdx
}