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
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(50) UNIQUE NOT NULL,
        elo_rating INT DEFAULT 1000,
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Rankings (
        user_id INT PRIMARY KEY,
        ranking INT,
        elo_rating INT,
        last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS GameRecords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player1_id INT,
        player2_id INT,
        winner_id INT,
        player1_old_elo INT,
        player1_new_elo INT,
        player2_old_elo INT,
        player2_new_elo INT,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES Users(id),
        FOREIGN KEY (player2_id) REFERENCES Users(id)
      )
    `);
    console.log('✅ MySQL Pool Ready!');
  } finally {
    connection.release();
  }
}

module.exports = { pool, redisClient, connectDBs };