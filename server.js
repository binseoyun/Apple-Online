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
const { createAdapter } = require('@socket.io/redis-adapter');
const multer = require('multer');

const storage = multer.diskStorage({
  // 파일이 저장될 경로를 지정
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 'uploads' 폴더에 저장
  },
  // 파일의 새로운 이름을 지정 (가장 중요한 부분)
  filename: function (req, file, cb) {
    const userId = req.user.id;
    // path.extname()으로 원본 파일의 확장자를 추출합니다. (예: '.jpg')
    const ext = path.extname(file.originalname);
    
    // 최종 파일 이름: "유저ID-현재시간.확장자" (예: user123-1678886400000.jpg)
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage: storage });

const roomHandler = require('./server/handlers/roomHandlers');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login.html');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://www.applegame.shop", "https://applegame.shop"],
    credentials: true
  }
});

connectDBs();

const pubClient = redisClient;
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Redis Adapter is connected.');

  server.listen(PORT, HOST => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.errer('Redis connection failed:', err);
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

const redirectIfInGame = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  try {
    const userId = req.user.id;
    const roomId = await redisClient.get(`user-${userId}-room`);
    if (roomId) {
      const roomData = await redisClient.hGetAll(String(roomId));
      const roomStatus = roomData.status;
      if (roomStatus === 'waiting') {
        return res.redirect(`/wating.html?roomId=${roomId}&password=${roomData.password}&mode=join`);
      } else if (roomStatus === 'playing') {
        return res.redirect(`/game.html?roomId=${roomId}&password=${roomData.password}`);
      }
    }

    next();
  } catch(error) {
    console.error('Redirect Middleware error: ', error);
    next();
  }
};

const PORT = 3000;
const HOST = '127.0.0.1';

const path = require('path');
const fs = require('fs');
const authRoutes = require('./server/routes/authRoutes');
const userController = require('./server/controllers/userController');
const { url } = require('inspector');


app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('trust proxy', 1);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = { id: id, name: '사용자' + id };
  done(null, user);
});

passportConfig(passport);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', authRoutes);

app.get('/api/me', ensureAuthenticated, (req, res) => {
  res.json({id: req.user.id, name: req.user.name});
});

app.get('/api/profile/get', ensureAuthenticated, async(req, res) => {
  if (req.user.id) {
    const profileData = await userController.getProfile(req.user.id); 
    if (profileData) {
      res.json(profileData);
    } else {
      res.status(404).send('Not Found');
    }
  } else {
    res.status(403).send('권한이 없습니다.');
  }
});

app.post('/api/profile/update', ensureAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.id;
    const newUsername = req.body.username; // 텍스트 데이터는 req.body에 있습니다.
    const newImageFile = req.file; // 이미지 파일 데이터는 req.file에 있습니다.
    // 1. 닉네임 업데이트 (DB에 쿼리)
    await userController.updateUserNickname(userId, newUsername);
    // 2. 새 이미지가 업로드되었으면, 이미지 URL도 업데이트
    if (newImageFile) {
      const userData = await userController.getProfile(userId);
      const oldImage = userData.profile_image_url;
      const newImageUrl = `/uploads/${newImageFile.filename}`;
      await userController.updateUserImageUrl(userId, newImageUrl);

      if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, oldImageUrl);
        // 파일이 실제로 존재하는지 확인 후 삭제 (더 안전한 방법)
        if (fs.existsSync(oldImagePath)) {
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error(`기존 이미지 파일 삭제 실패: ${oldImagePath}`, err);
            } else {
              console.log(`기존 이미지 파일 삭제 성공: ${oldImagePath}`);
            }
          });
        }
      }
    }

    console.log(`[Profile Update] User ${userId} updated their profile.`);
    res.json({ message: 'Profile updated successfully!' });

  } catch (error) {
    console.error('Profile update server error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, 'public', 'html', 'lobby.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
  }
});
app.get('/game.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'game.html'));
});
app.get('/whatareyoudoing.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'whatareyoudoing.html'));
});
app.get('/addroom.html', ensureAuthenticated, redirectIfInGame, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'addroom.html'));
});
app.get('/editprofile.html', ensureAuthenticated, redirectIfInGame, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'editprofile.html'));
});
app.get('/login.html', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, 'public', 'html', 'lobby.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
  }
});
app.get('/lobby.html', ensureAuthenticated, redirectIfInGame, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'lobby.html'));
});
app.get('/profile.html', ensureAuthenticated, redirectIfInGame, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'profile.html'));
});
app.get('/ranking.html', ensureAuthenticated, redirectIfInGame, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'ranking.html'));
});
app.get('/wating.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'wating.html'));
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
  
  socket.emit('your_id', { id: userId });

  socket.userId = userId;

  // -- 유저 id 기반 접속/종료 로직 -- /
  socket.join(userId);

  io.in(userId).allSockets().then(sockets => {
    if (sockets.size === 1) {
      console.log(`✅ A user visited our server!: ${userId}`);
    }
  });

  roomHandler.registerRoomsHandlers(io, socket, redisClient);

  socket.on('joinLobby', () => {
    socket.join('lobby');
  });

  socket.on('disconnect', () => {
    setTimeout(() => {
      io.in(userId).allSockets().then(sockets => {
        if (sockets.size === 0) {
          console.log(`❌ A user disconnected: ${userId}`);
        }
      })
    }, 3000);
  });
});