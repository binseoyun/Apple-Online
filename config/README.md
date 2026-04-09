# config/

서버의 외부 서비스(DB, 캐시) 연결 설정 모듈입니다.

## 파일 구성

### `db.js`

| 항목 | 내용 |
|------|------|
| MySQL | `mysql2/promise` 기반 커넥션 풀 생성 (`connectionLimit: 10`) |
| Redis | `redis` 클라이언트 생성 (`.env`의 `REDIS_URL` 사용) |
| `connectDBs()` | 서버 시작 시 호출 — MySQL 테이블 자동 생성 (`CREATE TABLE IF NOT EXISTS`) |

## 생성되는 테이블

| 테이블 | 역할 |
|--------|------|
| `Users` | 유저 정보 (google_id, nickname, elo_rating, profile_image_url) |
| `Rankings` | 유저별 ELO 기반 랭킹 (10분마다 upsert) |
| `GameRecords` | 게임 전적 (player1/2, winner, ELO 변동 이력) |

## 환경 변수 (`.env`)

```
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=...
REDIS_URL=redis://redis:6379
```

## export

```js
const { pool, redisClient, connectDBs } = require('./config/db');
```
