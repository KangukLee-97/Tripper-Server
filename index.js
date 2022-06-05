require('dotenv').config();

const express = require('./config/express');
const {logger} = require('./config/winston');
let port;

if (process.env['NODE_ENV'] === 'development') {
    port = process.env["DEV_PORT"];
} else if (process.env['NODE_ENV'] === 'production') {
    port = process.env["PROD_PORT"];
} else {
    port = process.env["LOCAL_PORT"];
}

express().listen(port);
logger.info(`${process.env["NODE_ENV"]} - API Server Start At Port ${port}`);