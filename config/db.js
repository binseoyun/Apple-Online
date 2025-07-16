require('dotenv').config();

const mysql = require('mysql2/promise');
const redis = require('redis');

// 1. MySQL 연결 풀(Pool) 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // 설치 시 설정한 비밀번호
  database: 'apple_game_db', // 사용할 데이터베이스 이름
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Redis 클라이언트 생성
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.FLUSHDB;

// 연결 테스트 및 모듈 export
async function connectDBs() {
  // MySQL은 요청 시점에 연결되므로 별도 connect() 호출 불필요
  console.log('✅ MySQL Pool Ready!');
}

module.exports = { pool, redisClient, connectDBs };