const AWS = require('aws-sdk');
const secret_key = require('../secret');

const AWS_S3 = new AWS.S3({
    accessKeyId: secret_key.S3.ACCESS_KEY,
    secretAccessKey: secret_key.S3.SECRET_KEY,
    region: secret_key.S3.REGION
});

module.exports = AWS_S3;