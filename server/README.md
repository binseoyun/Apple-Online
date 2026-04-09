# server/

백엔드 비즈니스 로직 전체를 담당하는 디렉토리입니다.  
Express 라우터, Passport 인증, Socket.IO 이벤트 핸들러, 게임 로직으로 구성됩니다.

## 디렉토리 구조

```
server/
├── controllers/
│   ├── passport.js       # Google OAuth 전략 설정
│   ├── userController.js # 유저 CRUD, ELO 계산, Google 로그인 핸들러
│   └── rankingService.js # 전체 유저 랭킹 업데이트 서비스
├── handlers/
│   ├── roomHandlers.js   # Socket.IO 방 관련 이벤트 핸들러
│   └── gameLogic.js      # 게임 맵 생성, 드래그 계산, 점수 계산 순수 함수
└── routes/
    ├── authRoutes.js     # /auth/* 라우터
    └── userRoutes.js     # /users/* 라우터
```

---

## controllers/

### `passport.js`
- **Google OAuth 2.0** 전략을 Passport에 등록
- 신규 유저: `Users` 테이블에 INSERT (닉네임 중복 시 숫자 suffix 자동 부여)
- 기존 유저: `google_id` 기준으로 조회 후 반환
- `serializeUser` / `deserializeUser` 로 세션 연동

### `userController.js`
| 함수 | 역할 |
|------|------|
| `getUserNickname(userId)` | 닉네임 조회 |
| `getProfile(userId)` | id, nickname, elo_rating, profile_image_url 조회 |
| `getRanking(userId)` | Rankings 테이블에서 순위 조회 |
| `updateUserNickname(userId, name)` | 닉네임 변경 |
| `updateUserElo(userId, elo)` | ELO 점수 업데이트 |
| `updateUserImageUrl(userId, url)` | 프로필 이미지 URL 변경 |
| `calculateElo(r1, r2, winner)` | ELO 레이팅 계산 (K=32) |
| `googleLogin` | `/auth/google` 진입점 |
| `googleCallback` | 로그인 성공 → 로비 리다이렉트 |
| `logout` | 세션 파괴 후 로그인 화면 이동 |

### `rankingService.js`
- `UPDATE Users → Rankings` 를 MySQL `RANK() OVER (ORDER BY elo_rating DESC)` 윈도우 함수로 한 번에 처리
- `ON DUPLICATE KEY UPDATE` 로 upsert
- `server.js`에서 **10분 cron**으로 주기 실행, 서버 시작 시 1회 즉시 실행

---

## handlers/

### `gameLogic.js`
순수 함수만 포함 (부작용 없음)

| 함수 | 역할 |
|------|------|
| `createMap()` | `crypto` 시드 기반 10×17 사과 맵 생성. 전체 합이 10의 배수가 되도록 마지막 셀 보정 |
| `dragApple(x1,y1,x2,y2,mapData)` | 드래그 영역 내 사과 좌표 목록 반환 |
| `calculateScore(apple_list, mapData)` | 선택된 사과 합산 = 10이면 사과 수 반환, 아니면 0 |

### `roomHandlers.js`
Socket.IO 이벤트와 Redis를 연결하는 핵심 핸들러

| 이벤트 (수신) | 처리 내용 |
|--------------|----------|
| `createRoom` | Redis Hash에 방 정보 저장, `rooms:waiting` Set 추가, 제목 Sorted Set 인덱싱 |
| `fastRoomGenerate` | `fastRooms` Set에서 랜덤 방 선택 or 생성 |
| `getRoomList` | `rooms:waiting` Set 전체 조회 후 클라이언트 전송 |
| `searchRooms` | `rooms:title:index` Sorted Set에서 Lex 범위 검색 |
| `joinRoom` | 방 입장 처리, 인원 2명 시 게임 상태로 전환 |
| `deleteRoom` | 방 삭제, 관련 Redis 키 정리 |
| 게임 진행 이벤트 | 맵 배포, 드래그 검증, 점수 집계, 타이머, WebRTC 시그널링 (offer/answer/ice) |

---

## routes/

### `authRoutes.js`
| Method | Path | 처리 |
|--------|------|------|
| GET | `/auth/google` | Google OAuth 시작 |
| GET | `/auth/google/callback` | 인증 완료 후 콜백 |
| GET | `/auth/logout` | 로그아웃 |

### `userRoutes.js`
| Method | Path | 처리 |
|--------|------|------|
| GET | `/users/:id` | 특정 유저 프로필 조회 |
| PUT | `/users/:id/nickname` | 닉네임 변경 |
