const s3 = require('./s3');
const request = require('request-promise');
const md5 = require('md5');
const secret_key = require('../secret');

const kakao_image_upload = async (url) => {
    const request_option = {
        method: 'GET',
        url: url,
        encoding: null
    };

    const params = {
        'Key': `kakaoProfiles/${md5(url)}`,
        'Bucket': secret_key.S3.BUCKET_NAME,
        'Body': await request(request_option),
        'ContentType': 'image/jpg'
    };

    return await s3.upload(params).promise();
};

module.exports = {
    kakao_image_upload
}