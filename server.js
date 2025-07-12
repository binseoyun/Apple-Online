const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { pool, redisClient, connectDBs } = require('./config/db');
const { v4: uuidv4 } = require('uuid')

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

// 게임 맵 관리(숫자가 양수면 사과 존재, 숫자가 0이면 사과 없음)

// 나중에 여기에 프론트엔드 파일들을 연결할 수 있습니다.
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`✅ A user connected: ${socket.id}`); // 유저 접속 시 콘솔에 메시지 출력

  socket.on('createRoom', async (userInfo) => {
    try {
        // 방 id 생성
        const roomId = uuidv4();
        const roomKey = `room:${roomId}`;

        // Redis에 방 정보(Hash) 저장
        await redisClient.hSet(roomKey, {
            player1: userInfo.id,
            player2: null,
            status: 'waiting', // waiting과 playing으로 상태 구분
            createdAt: Date.now()
        });

        await redisClient.sAdd('rooms', roomKey);

        // 방 정보

        // 방 참여 기능
        socket.join(roomId);

        console.log(`[Room Created] ID: ${roomId} by ${userInfo.nickname}`);

        // 방 생성 완료 사실 전달
        socket.emit('roomCreated', { roomId });
    } catch (error) {
        console.error('방 생성 중 에러 발생:', error);
        socket.emit('error', { message: '방을 만드는 데 실패했습니다.' });
    }
  });

  socket.on('joinRoom', async (userInfo, roomId) => {
    console.log(`[Room Join Start] To: ${roomId} by ${userInfo.nickname}`)

    // 방이 존재하는지 확인
    const roomKey = `room:${roomId}`
    const RoomExists = await redisClient.sIsMember('rooms', roomKey)

    // 방에 빈자리가 있는지 확인

    // 비밀번호가 일치하는지 확인
  });

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