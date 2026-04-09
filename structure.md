# 프로젝트 기술 스택 구성 상세

Apple-Online 프로젝트에서 각 기술이 **어디에, 어떻게** 사용되는지를 설명합니다.

---

## Redis

**용도: 휘발성 실시간 데이터 저장소 + Socket.IO 어댑터**

### 1. 게임 방 관리

| 자료구조 | 키 | 저장 내용 |
|---------|-----|----------|
| Hash | `{roomId}` | 방 정보 (title, nickname, password, player1, player2, status, createdAt) |
| Set | `rooms:waiting` | 대기 중인 방 ID 목록 |
| Set | `rooms:playing` | 진행 중인 방 ID 목록 |
| Set | `fastRooms` | 빠른 참여 대기 중인 방 ID 목록 |
| Set | `waits` | 현재 게임/대기 중인 유저 ID 목록 |
| String | `user-{userId}-room` | 유저가 현재 속한 방 ID |
| Sorted Set | `rooms:title:index` | 방 제목 Lex 정렬 인덱스 (`정규화된제목:roomId` 형식) |

**방 제목 검색 흐름:**
```
검색어 입력 → 소문자+공백제거 정규화
→ zRangeByLex('rooms:title:index', '[검색어', '[검색어\xff')
→ 매칭된 roomId 반환
```

### 2. 세션 저장소

`connect-redis`를 통해 Express 세션을 Redis에 저장합니다.  
서버 재시작 후에도 로그인 상태가 유지됩니다.

### 3. Socket.IO Redis Adapter

```js
const pubClient = redisClient;
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

Pub/Sub 방식으로 Socket.IO 이벤트를 공유 — 추후 다중 서버(수평 확장) 구조로 전환 시 코드 변경 없이 지원 가능합니다.

---

## MySQL

**용도: 영구 보존이 필요한 유저/게임 데이터**

### 테이블 구조

```
Users
├── id (PK)
├── google_id (UNIQUE) — OAuth 식별자
├── nickname (UNIQUE)
├── elo_rating (DEFAULT 1000)
└── profile_image_url

Rankings
├── user_id (PK, FK → Users.id)
├── ranking
├── elo_rating
└── last_updated_at

GameRecords
├── id (PK)
├── player1_id, player2_id (FK → Users.id)
├── winner_id
├── player1_old_elo, player1_new_elo
├── player2_old_elo, player2_new_elo
└── played_at
```

### ELO 랭킹 업데이트 방식

10분마다 cron으로 실행:
```sql
INSERT INTO Rankings (user_id, ranking, elo_rating)
SELECT id, RANK() OVER (ORDER BY elo_rating DESC), elo_rating
FROM Users
ON DUPLICATE KEY UPDATE ranking = VALUES(ranking), elo_rating = VALUES(elo_rating);
```

### ELO 계산 로직

```
E(A) = 1 / (1 + 10^((Rb - Ra) / 400))
새 Ra = Ra + 32 * (실제결과 - E(A))
```

강한 상대 승리 시 큰 폭 상승, 약한 상대 패배 시 큰 폭 하락합니다.

---

## Socket.IO

**용도: 서버-클라이언트 간 실시간 양방향 통신**

### 주요 이벤트 흐름

```
[로비]
클라이언트 → joinLobby       : 로비 Room 참여
서버 → newRoom/deleteRoom    : 방 목록 실시간 업데이트
서버 → playerCount          : 동시 접속자 수 브로드캐스트

[방 생성/참여]
클라이언트 → createRoom      : 방 생성 요청
서버 → roomCreated          : 생성 완료 + 대기실 이동
클라이언트 → joinRoom        : 방 참여 요청
서버 → gameStart            : 두 플레이어 모두 입장 시 게임 시작

[게임]
서버 → mapData              : 시드 기반 맵 배포
클라이언트 → drag            : 드래그 영역 전송
서버 → scoreUpdate          : 검증 후 점수 갱신 + 사과 제거
서버 → timeUp              : 타이머 종료, 결과 전송

[WebRTC 시그널링]
클라이언트 → offer/answer/ice : SDP 및 ICE Candidate 중계
```

### 인증 연동

```js
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
// 미인증 소켓은 즉시 disconnect
```

---

## WebRTC

**용도: 상대방 마우스 커서 위치의 P2P 실시간 전송**

### 연결 흐름

```
player1: createOffer → socket.emit('offer')
         ↓ (서버 중계)
player2: setRemoteDescription → createAnswer → socket.emit('answer')
         ↓ (서버 중계)
player1: setRemoteDescription
         ↓
ICE Candidate 교환 완료 → DataChannel 연결
```

### DataChannel 사용

```js
// 커서 좌표를 JSON으로 직렬화하여 P2P 전송
dataChannel.send(JSON.stringify({ x: cursorX, y: cursorY }));
```

서버를 거치지 않아 **지연 최소화**, 서버 트래픽 절감 효과가 있습니다.

---

## Google OAuth 2.0 (Passport.js)

**용도: 별도 회원가입 없이 구글 계정으로 로그인**

### 인증 흐름

```
/auth/google
→ Google 동의 화면
→ /auth/google/callback?code=...
→ passport-google-oauth20 전략 실행
→ DB에서 google_id 조회
→ 신규: INSERT + 닉네임 중복 자동 처리
→ 기존: 조회 후 반환
→ serializeUser → 세션(Redis)에 user.id 저장
→ /lobby.html 리다이렉트
```

---

## Express

**용도: HTTP API 서버 + 정적 파일 서빙 + 미들웨어 체인**

### 미들웨어 체인

```
요청
→ express-session (Redis 세션 복원)
→ passport.initialize / passport.session (유저 복원)
→ ensureAuthenticated (인증 확인)
→ redirectIfInGame (게임 중 이탈 감지)
→ 라우터 / 정적 파일
```

### `redirectIfInGame` 미들웨어

로비/방 생성 접근 시 Redis에서 `user-{id}-room` 키 조회:
- `status: waiting` → 방 자동 삭제 후 로비로 이동
- `status: playing` → 게임 화면으로 강제 복귀

---

## Multer

**용도: 프로필 이미지 업로드**

- 저장 위치: `uploads/` 폴더 (Docker 볼륨으로 영속화)
- 파일명 규칙: `{userId}-{timestamp}.{ext}`
- `/uploads/{filename}` 경로로 정적 서빙
- 프로필 수정 시 기존 이미지 파일 자동 삭제 (`fs.unlink`)

---

## Tailwind CSS

**용도: 유틸리티 기반 빠른 UI 개발**

- `src/input.css` → `npm run build` → `dist/output.css` 생성
- `public/html/*.html` 에서 Tailwind 클래스 직접 사용
- 커스텀 색상: `apple(#fcfcf8)`, `lemon(#eeee06)`
- 복잡한 레이아웃(게임 보드, 애니메이션)은 `public/css/` 의 개별 CSS 파일로 보완

---

## node-cron

**용도: 정기 랭킹 업데이트**

```js
cron.schedule('*/10 * * * *', () => {
  updateAllUserRankings();
});
```

10분마다 `Rankings` 테이블 전체 갱신, 서버 시작 시 1회 즉시 실행.

---

## Docker Compose 서비스 구성

```
┌──────────────────────────────────────────┐
│  app (Node.js :3001→3000)               │
│  ├── depends_on: mysql (healthy)        │
│  └── depends_on: redis                  │
├──────────────────────────────────────────┤
│  mysql (MySQL 8.0 :3307→3306)           │
│  ├── volume: mysql_data                 │
│  └── healthcheck: mysqladmin ping + SELECT 1 │
├──────────────────────────────────────────┤
│  redis (Redis 7 :6379)                  │
└──────────────────────────────────────────┘
```

- MySQL이 완전히 준비(healthcheck 통과)된 후에만 app 컨테이너가 시작됩니다.
- `uploads/` 폴더는 호스트와 바인드 마운트하여 컨테이너 재시작 후에도 이미지를 유지합니다.
