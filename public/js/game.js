//js/game.js
async function initializeGame() {
  let roomId = '';
  let userId = await getMyUserId();
  const socket = io("https://www.applegame.shop", {
      withCredentials: true
  });

  const urlParams = new URLSearchParams(window.location.search);

  // 'roomId'라는 이름의 파라미터 값을 가져옵니다.
  roomId = urlParams.get('roomId');
  password = urlParams.get('password');
  const board = document.getElementById('game-board');
  
  // WebRTC 관련 코드 //
  let peerConnection;
  let dataChannel;
  const opponentCursor = document.getElementById('opponent-cursor');
  let connectionTimeout = null;

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  function initializePeerConnection() {
    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice', { roomId: roomId, ice: event.candidate });
      }
    };

    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannelEvents();
    };

    peerConnection.onconnectionstatechange = (event) => {
      if (peerConnection.connectionState === 'connected') {
        clearTimeout(connectionTimeout);
      }
    };
  }

  function setupDataChannelEvents() {
    dataChannel.onopen = () => {
    };

    dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (opponentCursor.style.display === 'none') {
        opponentCursor.style.display = 'block';
      }
      opponentCursor.style.left = data.x + 'px';
      opponentCursor.style.top = data.y + 'px';
    };
  }

  function setupMouseListeners() {
    const gameBoard = document.getElementById('game-board');

    // 마우스 이동 이벤트 통합 리스너
    document.addEventListener('mousemove', (e) => {
        // --- 역할 1: P2P 커서 위치 전송 (쓰로틀링 적용) ---
        if (dataChannel && dataChannel.readyState === 'open') {

          // 좌표 계산 및 전송
          const boardRect = gameBoard.getBoundingClientRect();
          const mouseX = e.clientX - boardRect.left;
          const mouseY = e.clientY - boardRect.top;

          if (mouseX >= 0 && mouseX <= boardRect.width && mouseY >= 0 && mouseY <= boardRect.height) {
              dataChannel.send(JSON.stringify({ x: mouseX, y: mouseY, inBoard: true }));
          } else {
              dataChannel.send(JSON.stringify({ inBoard: false }));
          }
        }

        // --- 역할 2: 게임 드래그 로직 ---
        // 드래그 중이 아닐 때는 이 로직을 실행하지 않습니다.
        if (!isDragging) {
            return;
        }

        // 마우스가 보드 위에 있을 때만 드래그 로직 실행
        if (e.target.parentElement !== gameBoard) {
            return;
        }
        
        // (기존 드래그 로직을 여기에 그대로 가져옴)
        const currRect = e.target.getBoundingClientRect();
        const dragX = Math.min(dragStartX, currRect.left);
        const dragY = Math.min(dragStartY, currRect.top);
        const dragWidth = Math.abs(currRect.left - dragStartX);
        const dragHeight = Math.abs(currRect.top - dragStartY);
        
        dragBox.style.left = `${dragX}px`;
        dragBox.style.top = `${dragY}px`;
        dragBox.style.width = `${dragWidth + currRect.width}px`;
        dragBox.style.height = `${dragHeight + currRect.height}px`;

        if (!startCell) return;

        const index1 = [...board.children].indexOf(startCell) - 1;
        const index2 = [...board.children].indexOf(e.target) - 1;
        const row1 = Math.floor(index1 / cols);
        const col1 = index1 % cols;
        const row2 = Math.floor(index2 / cols);
        const col2 = index2 % cols;

        const currentIndex = [...board.children].indexOf(e.target) - 1;
        const currentRow = Math.floor(currentIndex / cols);
        const currentCol = currentIndex % cols;
        selectionCoords.end = { row: currentRow, col: currentCol };

        if (isAllowedDirection(row1, col1, row2, col2)) {
            if (!selectedCells.includes(e.target)) {
                selectCell(e.target);
            }
        }
    });
}

  socket.on('getOffer', async (offer) => {
    initializePeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { roomId: roomId, answer: answer });
  });

  socket.on('getAnswer', async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('getIce', async (ice) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
  });

  if (roomId !== '') {
    // 이 roomId를 사용해 서버에 방 참여 요청 등을 보냅니다.
    socket.emit('getGame', userId, roomId);
  } else {
    console.error('방 ID가 전달되지 않았습니다!');
    // 에러 처리 (예: 로비로 돌려보내기)
  }

  socket.on('what?', () => {
    alert("잘못된 접근입니다!");
    window.location.href = `lobby.html`;
  });

  const rows= 10; //행의 수
  const cols = 17; //열의 수

  let mapData = []

  function DrawMap(mapData) {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 17; j++) {
        const cell = document.createElement('div'); //각 셀은 div 요소로 생성
        const num = mapData[i][j];
        cell.textContent = num;
        cell.className = //Tailwind CSS 클래스를 사용하여 스타일링
        //셀크기, 사과 이미지, 숫자 스타일, 숫자 가운데 정렬, 원형, 마우스 반응
        "w-[40px] h-[40px] bg-[url('/apple.png')] bg-cover bg-center text-white text-sm font-bold flex items-center justify-center rounded-full cursor-pointer hover:scale-105 transition-transform";
        cell.setAttribute('data-value', num); //숫자 값을 data-value 속성에 저장
        if (Number(num) === 0) {
          cell.textContent = '';
          cell.style.backgroundImage = 'none';
          cell.classList.remove('apple');
        }
        board.appendChild(cell); //완성된 셀을 보드에 추가
      }
    }
  }
  //게임 시작 전 카운트 다운 로직을 구현하기 위해 startCountdown 추가
  //사과 셀 생성
  let map_update = 0;
  socket.on('map', (data) => {
    if (map_update > 0) {
      return;
    }
    DrawMap(data.mapData);
    mapData = data.mapData;

    async function createAndSendOffer() {
      initializePeerConnection(); // P2P 객체 생성
      dataChannel = peerConnection.createDataChannel('mouse-cursor-channel'); // 데이터 채널 생성
      setupDataChannelEvents(); // 데이터 채널 이벤트 설정
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer); // 자신의 정보로 offer 등록
      socket.emit('offer', { roomId: roomId, offer: peerConnection.localDescription });

      clearTimeout(connectionTimeout); // 이전 타이머가 있다면 해제
      connectionTimeout = setTimeout(() => {
          if (peerConnection.connectionState !== 'connected') {
              console.warn("연결 시간 초과! 재연결을 시도합니다...");
              createAndSendOffer(); // 연결 재시도
          }
      }, 3000);
    }
    setupMouseListeners();
    // P2P 요청
    // 내가 Player 1인지 확인하고, 맞다면 P2P 연결 제안(Offer)을 보냄
    if (String(data.userId) === String(userId)) {
      createAndSendOffer();
    } else {
      // Player 2는 Offer를 기다리기 전에 미리 P2P 객체를 만들어둬야 함
      // (ICE Candidate 교환을 최대한 빨리 시작하기 위함)
      initializePeerConnection();
    }

    // user data 설정
    const score1Element = document.getElementById("user1");
    const score2Element = document.getElementById("user2");
    const player1Row = score1Element.closest('tr');
    const player2Row = score2Element.closest('tr');
    const image1Div = player1Row.querySelector('td:nth-child(1) div');
    const image2Div = player2Row.querySelector('td:nth-child(1) div');
    const name1Element = player1Row.querySelector('td:nth-child(2)');
    const name2Element = player2Row.querySelector('td:nth-child(2)');
    image1Div.style.backgroundImage = `url('${data.image1}')`;
    image2Div.style.backgroundImage = `url('${data.image2}')`;
    score1Element.textContent = `Score: ${data.score1}`;
    score2Element.textContent = `Score: ${data.score2}`;
    name1Element.textContent = `${data.user1}(${data.rating1}점)`;
    name2Element.textContent = `${data.user2}(${data.rating2}점)`;
    map_update++;
  });


  socket.on('getScore', (result) => {
    if (result.userId == userId) {
      if (result.num == 1) {
        const currentScore = getScore("user1");
        setScore("user1", currentScore + result.score);
      } else {
        const currentScore = getScore("user2");
        setScore("user2", currentScore + result.score);
      }  
      //내가 점수를 얻었을 때 소리 재생 추가
      playScoreSound();
    } 
    else {
      if (result.num == 1) {
        const currentScore = getScore("user1");
        setScore("user1", currentScore + result.score);
      } else {
        const currentScore = getScore("user2");
        setScore("user2", currentScore + result.score);
      }  
    }
  });


  //드레그 관련 변수 및 함수
  let isDragging = false; //드래그 상태를 추적
  let selectedCells = []; //선택된 셀을 저장하는 배열   
  let startCell = null; //드래그 시작 위치
  let selectionCoords = { start: null, end: null };

  //드레그 박스 
  const dragBox = document.getElementById('drag-box');
  let dragStartX, dragStartY; //드래그 시작 좌표 초기화
  dragStartX = 0;
  dragStartY = 0;

    
  //드레그 시작(마우스 누르면 박스가 표시 시작 됨)
  board.addEventListener("mousedown", (e) => {
    if (e.target.parentElement !== board) return;
    //드레그 됐다고 표시, 기존에 드레그 된것(기존 선택 셀 초기화)
    isDragging = true; 
    clearSelection(); //기존에 선택한 셀을 초기화 했음

    const startIndex = [...board.children].indexOf(e.target) - 1;
    const startRow = Math.floor(startIndex / cols);
    const startCol = startIndex % cols;
    
    selectionCoords.start = { row: startRow, col: startCol };
    selectionCoords.end = { row: startRow, col: startCol };

    startCell = e.target; //드레그 시작 셀 지정(새롭게 선택된 셀 재지정)
    selectCell(startCell);

    const rect = e.target.getBoundingClientRect();
    dragStartX = rect.left;
    dragStartY = rect.top;

    dragBox.style.left = `${dragStartX}px`;
    dragBox.style.top = `${dragStartY}px`;
    dragBox.style.width = `${rect.width}px`;
    dragBox.style.height = `${rect.height}px`;
    dragBox.style.display = "block"; //드래그 박스 표시
  });

  //드래그 종료(마우스 뗐을 때)
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false; //드레그 상태 해제
      dragBox.classList.add("hidden"); //드래그 박스 숨김
      dragBox.style.display = "none"; //드래그 박스 숨김
      checkSum();
    }
  });

  function selectCell(cell) {
    cell.classList.add("selected", "apple");
    selectedCells.push(cell);
  }

  function showOpponentDrag(startX, startY, endX, endY) {
    const opponentDragOverlay = document.createElement('div');
    opponentDragOverlay.className = 'opponent-drag absolute bg-red-500 opacity-50 border border-red-700 pointer-events-none';
    opponentDragOverlay.style.left = `${Math.min(startX, endX) * 40}px`; // 셀 크기(40px) 고려
    opponentDragOverlay.style.top = `${Math.min(startY, endY) * 40}px`;
    opponentDragOverlay.style.width = `${(Math.abs(endX - startX) + 1) * 40}px`;
    opponentDragOverlay.style.height = `${(Math.abs(endY - startY) + 1) * 40}px`;
    
    board.appendChild(opponentDragOverlay);
    
    // 잠시 후 빨간색 영역 제거
    setTimeout(() => {
      opponentDragOverlay.remove();
    }, 100); // 0.5초 동안 표시
  }

  socket.on('deleteApple', (data) => {
    const startX = Math.min(data.col1, data.col2);
    const startY = Math.min(data.row1, data.row2);
    const endX = Math.max(data.col1, data.col2);
    const endY = Math.max(data.row1, data.row2);
    const who = data.userId;

    if (who !== String(userId)) {
      showOpponentDrag(startY, startX, endY, endX)
    }

    for (let i = startX; i <= endX; i++) {
      for (let j = startY; j <= endY; j++) {
        const index = i * cols + j;
        const cellElement = board.children[index+1];

        if (cellElement) {
          cellElement.textContent = '';
          cellElement.style.backgroundImage = 'none';
          cellElement.classList.remove('apple');
        }
      }
    }
  });

  function clearSelection() {
    selectedCells.forEach((cell) => cell.classList.remove("selected"));
    selectedCells = [];
    startCell = null;
  }

  //합이 10인지 확인하는 함수
  function checkSum() {
    if (!selectionCoords.start || !selectionCoords.end) return;

    //숫자의 합이 10인지 확인하는 위치
    socket.emit('dragApples', 
      selectionCoords.start.col, 
      selectionCoords.start.row, 
      selectionCoords.end.col, 
      selectionCoords.end.row,
      roomId, userId
    );
  }

  function isAllowedDirection(startRow, startCol, currRow, currCol) {
    const rowDiff = currRow - startRow;
    const colDiff = currCol - startCol;
    return (
      rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)
    );
  }

  //점수 가져와서 숫자만 추출
  function getScore(playerId) {
      const text=document.getElementById(playerId).textContent;
      const score = parseInt(text.replace("Score:" ," ")); //숫자만 추출
      return score;
  }

  // 점수 설정
  function setScore(playerId, newScore) {
    document.getElementById(playerId).textContent = `Score: ${newScore}`;
  }

  // JS에서 width 조절
  function updateTimerBar() {
    const percent = (timeLeft / 60) * 100;
    const bar = document.getElementById("timer-bar");
    bar.style.width = `${percent}%`;

    //남은 시간에 따라 색상 변화
    if (percent <= 25) {
      bar.classList.remove("bg-yellow-400", "bg-green-400");
      bar.classList.add("bg-red-500");
    } else if (percent <= 50) {
      bar.classList.remove("bg-green-400");
      bar.classList.add("bg-yellow-400");
    }
  }

  // 타이머 
  let timeLeft = 60; //게임 진행 시간 60초
  const timerText = document.getElementById("timer-text");
  const timerBar = document.getElementById("timer-bar");
  let game = true;

  socket.on('updateTime', (data) => {
    timeLeft = data.timeLeft;
    updateTimerUI();
    updateTimerBar();
  });

  socket.on('whatareyoudoing', () => {
    window.location.href = 'whatareyoudoing.html';
  });

  socket.on('gameEnd', (data) => {
    let elo_diff = 0;
    if (data.player1 == userId) {
      elo_diff = data.elo_A;
    } else {
      elo_diff = data.elo_B;
    }

    let plus = "";
    if (elo_diff > 0) {
      plus = "+";
    }


    if (game) {
      console.log(data.winner, userId);
      if (String(data.winner) == String(userId)) {
        game = false;
        //이겼을 때 소리 재생 추가
        playWinSound();
        //이겼을 때 confetti 효과 추가
        playWinEffect();
        //이겼을 때 승리 배너 추가
        const winOverlay=document.getElementById("winOverlay");
        winOverlay.classList.remove("hidden"); //숨겨져 있던 승리 배너를 화면에 표시
        //endGame()에서 alert()가 먼저 뜨면 배너가 보이지도 않을 수 도 있어서 시간 지연 시킴
        setTimeout(()=>{
        endGame(`승리하였습니다!\n(점수: ${plus}${elo_diff})`);
        },500); //0.5초 후 실행

      } else if (data.winner == '') {
        game = false;
        //비겼을 때 배너 추가
        const drawOverlay=document.getElementById("drawOverlay");
        drawOverlay.classList.remove("hidden"); 
        setTimeout(()=>{
        endGame(`비겼습니다!\n(점수: ${plus}${elo_diff})`);
        },500);
      } else {
        game = false;
        //졌을 때 소리 재생 추가
        playLoseSound();
        //졌을 때 효과 추가
        playLoseEffect();
        //졌을 때 패배 배너 추가
        const loseOverlay=document.getElementById("loseOverlay");
        loseOverlay.classList.remove("hidden");
        //endGame()에서 alert()가 먼저 뜨면 배너가 보이지 않을 수 도 있으서 시간 지연 시킴
        setTimeout(()=>{
        endGame(`패배하였습니다!\n(점수: ${plus}${elo_diff})`);
      },500);
  }
  }});



  // 타이머 UI 업데이트
  function updateTimerUI() {
    // 숫자 업데이트
    if (timerText) timerText.textContent = `Time: ${timeLeft}s`;

    // 진행 바 너비 설정
    if (timerBar) {
      const percent = (timeLeft / 60) * 100;
      timerBar.style.width = `${percent}%`;

      // 색상 변화
      if (percent <= 25) {
        timerBar.classList.remove("bg-yellow-400", "bg-green-400");
        timerBar.classList.add("bg-red-500");
      } else if (percent <= 50) {
        timerBar.classList.remove("bg-green-400");
        timerBar.classList.add("bg-yellow-400");
      } else {
        timerBar.classList.add("bg-green-400");
        timerBar.classList.remove("bg-yellow-400", "bg-red-500");
      }

      //배경색 변경하기 위해 추가
      //시간이 10초 이하 남았을 때 빨간색이 뜨게 설정
      const gameRoot = document.getElementById("game-main");
      if (timeLeft <= 10){
        gameRoot.classList.add("bg-red-100","transition-colors");
      }
    }
  }



  // 게임 종료 처리
  function endGame(message) {
    //종료했을 때 alert 메세지 
    alert(message);
    board.style.pointerEvents = "none";
    clearSelection();
    //게임 종료시 lobby로 이동
      setTimeout(() => {
          window.location.href = "lobby.html"; // 예: lobby.html로 이동
      }, 1000); // 1초 후 lobby로 이동
  }

  //게임 성공 시 소리나게
  function playScoreSound(){
    const sound=document.getElementById("scoreSound");
    sound.currentTime=0; //같은 소리를 연속으로 재생할 수 있게
    sound.play();
  }

  //게임에서 이겼을 때 소리 재생 추가
  function playWinSound(){
    const win=document.getElementById("winSound");
    if(win){
      win.currentTime=0;
      win.play();
    }
  }
  //게임에서 졌을 때 소리 재생 추가
  function playLoseSound(){
    const lose=document.getElementById("loseSound");
    if(lose){
      lose.currentTime=0;
      lose.play();
    }
    
  }

  //게임에서 이겼을 때 confetti 효과 호출
  function playWinEffect(){
    confetti({
      particleCount: 150, //100개의 꽃잎
      spread: 360, //방향 분산 폭(0~360)
      origin: { y: 0.6 }, //화면 중앙 아래(60%) 위치에서 위로
      colors: ['#c94739ff', '#ff69b4', '#ffb6c1'], //분홍빛 꽃잎처럼 보이도록 색 지정
      shapes: ['circle'], //꽃잎처럼 보이는 원형 입자
      gravity:0.5 //천천히 떨어지는 효과
    });
  }

  //게임에서 졌을 때 confetti 효과 호출
  function playLoseEffect(){
    confetti({
      particleCount: 150,
        spread: 360,
        origin: { x: 0.5, y: 1 }, // 아래에서 위로 날림
        colors: ['#333333', '#2e1d1dff', '#190606ff'], // 어두운 계열
        shapes: ['circle'], // 사과처럼 보이는 원
        gravity:0.5
    })
  }
}