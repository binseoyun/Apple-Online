# public/

브라우저에 직접 서빙되는 정적 파일 디렉토리입니다.  
Express의 `express.static()` 으로 `/` 경로에서 서빙됩니다.  
프레임워크 없이 **Vanilla JS + HTML + Tailwind CSS** 로 구성됩니다.

## 디렉토리 구조

```
public/
├── html/   # 각 화면 HTML
├── js/     # 화면별 클라이언트 JavaScript
├── css/    # 화면별 커스텀 CSS (Tailwind 외 추가 스타일)
└── img/    # 이미지 리소스
```

---

## 화면 목록

| 화면 | HTML | JS | CSS | 설명 |
|------|------|----|-----|------|
| 로그인 | `login.html` | `login.js` | `login.css` | Google 로그인 버튼 진입점 |
| 로비 | `lobby.html` | `lobby.js` | `lobby.css` | 방 목록, 검색, 생성, 빠른 참여, 접속자 수 |
| 방 생성 | `addroom.html` | `addroom.js` | `addroom.css` | 방 제목/비밀번호 입력 후 대기실 이동 |
| 대기실 | `wating.html` | `wating.js` | - | 상대 입장 대기, 사과 애니메이션 |
| 게임 | `game.html` | `game.js` | `game.css` | 실시간 게임 진행 (Socket.IO + WebRTC) |
| 랭킹 | `ranking.html` | `ranking.js` | - | ELO 기반 TOP3 랭킹 표시 |
| 프로필 | `profile.html` | `profile.js` | `profile.css` | 내 프로필, ELO 점수, 전적 목록 |
| 프로필 수정 | `editprofile.html` | `editprofile.js` | `editprofile.css` | 닉네임/이미지 변경 (multipart 업로드) |
| 뭐하는중 | `whatareyoudoing.html` | - | - | 이미 방에 있는 유저 접근 시 표시 |

---

## js/ 주요 파일 설명

### `auth.js`
- `getMyUserId()` 공통 함수 — `/api/me` 호출로 현재 로그인 유저 ID 반환
- 모든 화면에서 공통 import

### `game.js`
가장 복잡한 클라이언트 파일

**Socket.IO 이벤트 흐름**
```
joinGame → mapData 수신 → 카운트다운(3,2,1) → 게임 시작
drag 이벤트 → 서버 검증 → scoreUpdate 수신 → 화면 갱신
timeUp → 결과 화면 (승리/패배 배너 + BGM)
```

**WebRTC DataChannel**
- STUN 서버: `stun.l.google.com:19302`
- `offer/answer/ice` 시그널링은 Socket.IO 경유
- DataChannel 연결 후 상대방 마우스 커서 좌표를 P2P로 전송 (서버 미경유)

### `lobby.js`
- Socket.IO로 실시간 방 목록 수신 (`newRoom`, `deleteRoom` 이벤트)
- 방 클릭 시 비밀번호 모달 표시
- `filterRoomList()` 로 클라이언트 측 방 이름 필터링
- 동시 접속자 수 실시간 표시

---

## CSS

| 파일 | 방식 |
|------|------|
| Tailwind 클래스 | HTML에 인라인으로 적용 |
| `*.css` 파일 | Tailwind로 처리하기 까다로운 커스텀 애니메이션, 게임 보드 레이아웃 등 보완 |
