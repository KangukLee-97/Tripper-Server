const secret_key = require('../../../config/secret');
const baseResponse = require("../../../config/baseResponseStatus");
const regex = require('../../../config/regex/regex');
const { response, errResponse } = require("../../../config/response");
const axios = require("axios");
const feedService = require("./feedService");
const userProvider = require("../User/userProvider");

/* 개별 함수들 */
function calDay(firstDate, secondDate) {
    let dateFirstDate = new Date(firstDate.substring(0, 4), firstDate.substring(4, 6) - 1, firstDate.substring(6, 8));
    let dateSecondDate =
        new Date(secondDate.substring(0, 4), secondDate.substring(4, 6) - 1, secondDate.substring(6, 8));
    let betweenTime = Math.abs(dateSecondDate.getTime() - dateFirstDate.getTime());
    return Math.floor(betweenTime / (1000 * 60 * 60 * 24));
}

/**
 * API FD1: 여행 게시물 작성하기 API
 * [POST] /app/feeds/
 * body: information, metadata, day
 * headers: JWT Token
 */
exports.postFeed = async (req, res) => {
    let hashtagArr, thumnails;

    // Request 변수
    const { information, metadata, day } = req.body;
    const myIdx = req.verifiedToken.userIdx;

    // Information 변수
    const startDate = information.startDate;
    const endDate = information.endDate;
    const title = information.title;
    const introduce = information.introduce;
    let traffic = information.traffic;

    // Metadata 변수
    if (!metadata) {
        hashtagArr = [];
        thumnails = [];
    } else {
        hashtagArr = metadata.hashtag;
        thumnails = metadata.thumnails;
    }

    /* Validation - User */
    // 본인 탈퇴 유무
    const myStatus = await userProvider.checkUserStatus(myIdx);
    if (myStatus === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    /* Validation - Information */
    if (!information)   // information 객체를 입력 안했을 경우
        return res.send(errResponse(baseResponse.FEED_INFORMATION_EMPTY));
    if (!startDate)   // 시작 날짜 없을 경우
        return res.send(errResponse(baseResponse.FEED_STARTDATE_EMPTY));
    if (!endDate)   // 도착 날짜 없을 경우
        return res.send(errResponse(baseResponse.FEED_ENDDATE_EMPTY));
    if (!(regex.regex_date.test(startDate)) || !(regex.regex_date.test(endDate)))   // 시작,도착 날짜 형식 맞지 않을 경우
        return res.send(errResponse(baseResponse.FEED_DATE_ERROR_TYPE))
    if (!traffic)   // 교통 수단 없을 경우
        return res.send(errResponse(baseResponse.FEED_TRAFFIC_EMPTY));
    if (!title)   // 게시물 제목 없을 경우
        return res.send(errResponse(baseResponse.FEED_TITLE_EMPTY));
    if (!introduce)   // 게시물 소개 없을 경우
        return res.send(errResponse(baseResponse.FEED_INTRODUCE_EMPTY));

    // 시작 날짜와 도착 날짜의 차이 변수 설정
    const dateDiff = calDay(startDate.replace(/-/gi, ""), endDate.replace(/-/gi, "")) + 1;

    /* Validation - Day */
    if (!day)   // day 객체 입력 안했을경우
        return res.send(errResponse(baseResponse.FEED_DAY_EMPTY));
    if (day.length !== dateDiff)
        return res.send(errResponse(baseResponse.FEED_DAY_NOT_MATCH));

    /* Validation - Metadata */
    // 해시태그 및 썸네일 사진은 없어도 괜찮음.

    // body로 받아온 traffic에 맞는 기호 설정
    switch(traffic)
    {
        case '자차로 여행':
            traffic = 'C';
            break;
        case '대중교통 여행':
            traffic = 'P';
            break;
        case '자전거 여행':
            traffic = 'B';
            break;
        case '도보로 여행':
            traffic = 'W';
            break;
        default:
            return res.send(errResponse(baseResponse.FEED_TRAFFIC_ERROR_TYPE));
    }

    const createFeedResult = await feedService.createNewFeed(
        myIdx, startDate, endDate, traffic, title,
        introduce, hashtagArr, thumnails, day, dateDiff
    );
    return res.send(response(baseResponse.TRAVEL_UPLOAD_SUCCESS, { 'travelIdx': createFeedResult }));
};

/**
 * API FD2: 키워드로 장소 검색 API
 * [GET] /app/feeds/area-search-keyword
 * query string: area, page
 */
exports.searchArea = async (req, res) => {
    const KAKAO_REST_KEY = secret_key.KAKAO_REST_KEY;
    const area = String(req.query.area);   // 사용자 검색어
    const page = parseInt(req.query.page);   // 결과 페이지 번호
    const sort_method = 'accuracy';   // 정확성 vs 거리순
    const size = 10;   // 한 페이지에서 보여지는 결과 개수

    /* Validation */
    if (!area)
        return res.send(errResponse(baseResponse.KAKAO_AREA_EMPTY));
    if (area.length < 2)
        return res.send(errResponse(baseResponse.KAKAO_AREA_LENGTH_ERROR));
    if (!page && page !== 0)
        return res.send(errResponse(baseResponse.PAGE_EMPTY));
    if (page < 1 || page >= 6 )
        return res.send(errResponse(baseResponse.PAGE_NUMBER_ERROR));

    let result;
    // let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&x=${x}&y=${y}&page=${page}&size=${size}&sort=${sort_method}`
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&page=${page}&size=${size}&sort=${sort_method}`
    try {
        result = await axios({
            method: 'GET',
            url: encodeURI(url),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
            }
        });
    } catch(err) {
        return res.send(errResponse(baseResponse.AREA_SEARCH_FAILED));
    }

    if ((result.data.documents).length === 0)   // 조회 결과가 없으면?
        return res.send(errResponse(baseResponse.AREA_SEARCH_RESULT_EMPTY));

    let is_end = result.data.meta.is_end;
    let result_arr = result.data.documents;
    let new_result_arr = [];

    for(let i in result_arr) {
        if (result_arr[i].category_group_code === '') result_arr[i].category_group_code = null;
        if (result_arr[i].category_group_name === '') result_arr[i].category_group_name = null;

        let temp = {
            address_name: result_arr[i].address_name,
            category_code: result_arr[i].category_group_code,
            category_name: result_arr[i].category_group_name,
            place_name: result_arr[i].place_name,
            x: result_arr[i].x,
            y: result_arr[i].y
        };

        new_result_arr.push(temp);
    }

    return res.send(response(baseResponse.AREA_INQUIRE_KEYWORD_SUCCESS, { 'pageNum': page, 'is_end': is_end, 'list': new_result_arr }));
};