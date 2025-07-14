//js/game.js
(async () => {
  let roomId = '';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. 현재 페이지의 URL에서 파라미터를 읽어옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    
    // 2. 'roomId'라는 이름의 파라미터 값을 가져옵니다.
    roomId = urlParams.get('roomId');
    password = urlParams.get('password');

    if (roomId !== '') {
      console.log(`전달받은 방 ID: ${roomId}`);
      // 이 roomId를 사용해 서버에 방 참여 요청 등을 보냅니다.
      socket.emit('joinRoom', roomId, password);
    } else {
      console.error('방 ID가 전달되지 않았습니다!');
      // 에러 처리 (예: 로비로 돌려보내기)
    }
  });

  const socket = io(); //클라이언트에서 서버에 연결 요청
  const board = document.getElementById('game-board');
  const rows= 10; //행의 수
  const cols = 17; //열의 수

  let mapData = []

  socket.on('fulledRoom', () => {
    alert('방이 가득찼습니다!');
    window.location.href = `lobby.html`;
  });

  socket.on('PlayingRoom', () => {
    alert('게임이 이미 시작되었습니다!');
    window.location.href = `lobby.html`;
  });

  socket.on('BlockedRoom', () => {
    alert('비밀번호가 틀렸습니다!');
    window.location.href = `lobby.html`;
  });

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
        board.appendChild(cell); //완성된 셀을 보드에 추가
      }
    }
  }
  //게임 시작 전 카운트 다운 로직을 구현하기 위해 startCountdown 추가
  //사과 셀 생성
  socket.emit('getMap');
  console.log("맵을 요청 중입니다...");
  socket.on('map', (data) => {
    DrawMap(data.mapData);
    mapData = data.mapData;
    console.log(data.mapData);
    console.log("맵을 받았습니다.");

    /*
    //카운트 다운 로직을 구현하기 위해 변경
    //카운트다운 후에만 드레그 활성화 되게 
    board.style.pointerEvents="none";
    //콜백함수(카운트다운이 끝난 후에 어떤 작업을 실행해라는 방식)
    startCountdown(()=>{
      //카운트 다운 완료 후 드레그가 가능해짐
      board.style.pointerEvents="auto"; //드래그 가능해짐
      
    })
  */

  });


  socket.on('getScore', (result) => {
    console.log(result.userId);
    if (result.userId == socket.id) {
      const currentScore = getScore("user1");
      setScore("user1", currentScore + result.score);
      console.log(`${result.score} 점수를 얻었습니다.`);
      
      //내가 점수를 얻었을 때 소리 재생 추가
      playScoreSound();
    } 
    else {
      const currentScore = getScore("user2");
      setScore("user2", currentScore + result.score);
      console.log(`상대가 ${result.score} 점수를 얻었습니다.`);
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

    const startIndex = [...board.children].indexOf(e.target);
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

  //드래그 중 마우스 이동
  board.addEventListener("mouseover", (e) => {
    if (!isDragging || e.target.parentElement !== board) return;
    
    const currRect = e.target.getBoundingClientRect();

    const x = Math.min(dragStartX, currRect.left);
    const y = Math.min(dragStartY, currRect.top);
    const width = Math.abs(currRect.left - dragStartX);
    const height = Math.abs(currRect.top - dragStartY);

    dragBox.style.left = `${x}px`;
    dragBox.style.top = `${y}px`;
    dragBox.style.width=`${width+currRect.width}px`;
    dragBox.style.height = `${height+currRect.height}px`;


    if (!startCell) return;

    const index1 = [...board.children].indexOf(startCell);
    const index2 = [...board.children].indexOf(e.target);

    const row1 = Math.floor(index1 / cols);
    const col1 = index1 % cols;
    const row2 = Math.floor(index2 / cols);
    const col2 = index2 % cols;

    const currentIndex = [...board.children].indexOf(e.target);
    const currentRow = Math.floor(currentIndex / cols);
    const currentCol = currentIndex % cols;

    selectionCoords.end = { row: currentRow, col: currentCol };

    if (isAllowedDirection(row1, col1, row2, col2)) {
      if (!selectedCells.includes(e.target)) {
        selectCell(e.target);
      }
    }
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

  socket.on('deleteApple', (data) => {
    const startX = Math.min(data.col1, data.col2);
    const startY = Math.min(data.row1, data.row2);
    const endX = Math.max(data.col1, data.col2);
    const endY = Math.max(data.row1, data.row2);

    for (let i = startX; i <= endX; i++) {
      for (let j = startY; j <= endY; j++) {
        const index = i * cols + j;
        const cellElement = board.children[index];

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
    console.log(selectionCoords.start.row, 
      selectionCoords.start.col, 
      selectionCoords.end.row, 
      selectionCoords.end.col);

    if (!selectionCoords.start || !selectionCoords.end) return;

    //숫자의 합이 10인지 확인하는 위치
    socket.emit('dragApples', 
      selectionCoords.start.col, 
      selectionCoords.start.row, 
      selectionCoords.end.col, 
      selectionCoords.end.row,
      roomId, socket.id
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
    console.log("game update");
  });

  socket.on('gameEnd', (data) => {
    if (game) {
      if (data.winner == socket.id) {
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
        endGame("승리하였습니다!\n" + data.message);
        },500); //0.5초 후 실행

      } else if (data.winner == '') {
        game = false;
        //비겼을 때 배너 추가
        const drawOverlay=document.getElementById("drawOverlay");
        drawOverlay.classList.remove("hidden"); 
        setTimeout(()=>{
        endGame("비겼습니다!\n" + data.message);
        },500);
      
    

      } else if (data.winner == ' ') {
        game = false;
        //이겼을 때 소리 재생 추가
        playWinSound();
        //이겼을 때 꽃가루 효과 추가
        playWinEffect();
        //이겼을 때 승리 배너 추가
        const windOverlay=document.getElementById("winOverlay");
        windOverlay.classList.remove("hidden");
        //endGame()에서 alert()가 먼저 뜨면 배너가 보이지도 않을 수 도 있어서 시간 지연 시킴
        setTimeout(()=>{
        endGame("승리하였습니다!\n" + data.message);
        },500); //0.5초 후 실행

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
        endGame("패배하였습니다!\n" + data.message);
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
      const gameRoot =document.getElementById("game-main");
      if(timeLeft<=10){
        gameRoot.classList.add("bg-red-100","transition-colors");
      }else{
        gameRoot.classList.remove("bg-red-100");
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

  /*
  //카운트 다운 로직 추가
  function startCountdown(callback){
    //카운트 다운 표시하는 부분과 텍스트 받아서 3초 카운트 진행
    const overlay=document.getElementById("countdownOverlay");
    const text=document.getElementById("countdownText");
    let count=3;

    text.textContent=count; //3초 카운트 진행예정
    overlay.style.display="flex";

    const interval=setInterval(()=>{
      count--;
      if(count>0){
        text.textContent=count; 
      } else if(count==0){
        text.textContent="Start!";
      }  else{ //3초가 지나면
          clearInterval(interval); 
          overlay.style.display="none"; //카운트 다운 화면 사라지게
          //게임이 시작되게
          if(callback) callback(); //이 부분에서 callback()이 실행됨
        } 
    },1000); 
  }

  document.addEventListener('DOMContentLoaded',()=>{
    startCountdown(()=>{
      console.log("카운트다운 종료 후 실행됨");   
    });
  });
  */

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

/*
// 🌙 테마 전환 관련 코드
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('themeSelector');
  if (!selector) return;

  // 저장된 테마 불러오기
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  selector.value = savedTheme;

  // 드롭다운 변경 시 테마 적용
  selector.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    applyTheme(selectedTheme);
  });
});

// 실제로 테마를 적용하는 함수
function applyTheme(mode) {
  const body = document.body;
  if (mode === 'dark') {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
  localStorage.setItem('theme', mode); // 브라우저에 저장
}*/

  const themeSelector = document.getElementById('themeSelector');
  const htmlBody = document.body;

  themeSelector.addEventListener('change', function () {
    if (this.value === 'dark') {
      htmlBody.classList.add('dark-mode');
    } else {
      htmlBody.classList.remove('dark-mode');
    }
  });







});