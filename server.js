const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { pool, redisClient, connectDBs } = require('./config/db');
const { v4: uuidv4 } = require('uuid');

const roomHandler = require('./server/handlers/roomHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const HOST = '127.0.0.1';

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'lobby.html'));
});
app.get('/game.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'game.html'));
});
app.get('/addroom.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'addroom.html'));
});
app.get('/editprofile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'editprofile.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});
app.get('/lobby.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'lobby.html'));
});
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'profile.html'));
});

// 게임 맵 관리(숫자가 양수면 사과 존재, 숫자가 0이면 사과 없음)

// 나중에 여기에 프론트엔드 파일들을 연결할 수 있습니다.
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`✅ A user connected: ${socket.id}`); // 유저 접속 시 콘솔에 메시지 출력

  roomHandler(io, socket, redisClient);

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected'); // 유저 접속 해제 시 메시지 출력

    // 방에 접속 중이면 탈퇴 -> 만약 방에 남아있는 마지막 유저이면 방도 제거

    // 
  });
});

connectDBs().then(() => {
    server.listen(PORT, HOST => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
});

app.get('/pet', function(요청, 응답) {
    응답.send('펫용품 사시오')
})