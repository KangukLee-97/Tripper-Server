module.exports = function (app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // FD1. 여행 게시물 작성하기
    app.post('/app/feeds', feed.postFeed);

    // FD2. 키워드로 장소 검색 API (카카오 API)
    app.get('/app/feeds/area-search-keyword', feed.searchArea);


}