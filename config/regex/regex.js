const regex_date = /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/;
const regex_nickname = /^[가-힣a-zA-Z0-9]+$/;   // 닉네임 정규식

module.exports = {
    regex_date,
    regex_nickname
}