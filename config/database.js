const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '16112544',
    database: 'inextbroadbandstock',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 60000,
    timezone: 'Asia/Bangkok'
};

const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// จัดการข้อผิดพลาด
pool.on('error', (err) => {
    console.error('Database Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Lost connection to database - reconnecting...');
    }
});

module.exports = promisePool;