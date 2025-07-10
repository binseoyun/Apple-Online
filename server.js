const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { pool, redisClient, connectDBs } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// 나중에 여기에 프론트엔드 파일들을 연결할 수 있습니다.
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('✅ A user connected'); // 유저 접속 시 콘솔에 메시지 출력

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected'); // 유저 접속 해제 시 메시지 출력
  });
});

connectDBs().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
});