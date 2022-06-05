require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

if (process.env.NODE_ENV === 'production') {
    pool = mysql.createPool({
        host: process.env["RDS_HOST"],
        user: process.env["RDS_USER"],
        port: process.env["RDS_PORT"],
        password: process.env["RDS_PASSWORD"],
        database: process.env["RDS_PROD_DB"]
    });
} else if (process.env.NODE_ENV === 'development') {
    pool = mysql.createPool({
        host: process.env["RDS_HOST"],
        user: process.env["RDS_USER"],
        port: process.env["RDS_PORT"],
        password: process.env["RDS_PASSWORD"],
        database: process.env["RDS_DEV_DB"]
    });
} else {
    pool = mysql.createPool({
        host: process.env["RDS_HOST"],
        user: process.env["RDS_USER"],
        port: process.env["RDS_PORT"],
        password: process.env["RDS_PASSWORD"],
        database: process.env["RDS_LOCAL_DB"]
    });
}


module.exports = {
    pool: pool
};