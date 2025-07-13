require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { pool, redisClient, connectDBs } = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const passportConfig = require('./server/controllers/passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20');

const roomHandler = require('./server/handlers/roomHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://www.applegame.shop",
    credentials: true
  }
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax'
  }
});

const PORT = 3000;
const HOST = '127.0.0.1';

const path = require('path');
const authRoutes = require('./server/routes/authRoutes');

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true
// }));

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, none) => {
  const user = { id: id, name: '사용자' + id };
  done(null, user);
});

passportConfig(passport);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
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
app.get('/ranking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'ranking.html'));
});

// 게임 맵 관리(숫자가 양수면 사과 존재, 숫자가 0이면 사과 없음)

// 나중에 여기에 프론트엔드 파일들을 연결할 수 있습니다.
app.use(express.static('public'));

io.on('connection', (socket) => {
  const session = socket.request.session;

  if (!session.passport || !session.passport.user) {
    console.log('미인증 사용자 접속 시도');
    return socket.disconnect(true);
  }

  const userId = session.passport.user;
  console.log(`✅ A user connected: ${userId}`); // 유저 접속 시 콘솔에 메시지 출력

  socket.userId = userId;

  roomHandler.registerRoomsHandlers(io, socket, redisClient);
  socket.on('disconnecting', () => {
    try {
      const roomId = Array.from(socket.rooms).filter(room => room !== socket.id)[0];
      io.to(roomId).emit('gameEnd', {message: `플레이어가 퇴장하여 게임이 종료되었습니다.`, winner: ' '});

      if (roomHandler.gameStates?.[roomId]) {
        roomHandler.handleDeleteRoom(redisClient, roomId);
      }
    } catch (error) {

    }
  });

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected'); // 유저 접속 해제 시 메시지 출력
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