//js/game.js

let roomId = '';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 현재 페이지의 URL에서 파라미터를 읽어옵니다.
  const urlParams = new URLSearchParams(window.location.search);
  
  // 2. 'roomId'라는 이름의 파라미터 값을 가져옵니다.
  roomId = urlParams.get('roomId');

  if (roomId !== '') {
    console.log(`전달받은 방 ID: ${roomId}`);
    // 이 roomId를 사용해 서버에 방 참여 요청 등을 보냅니다.
    socket.emit('startGame', roomId);
  } else {
    console.error('방 ID가 전달되지 않았습니다!');
    // 에러 처리 (예: 로비로 돌려보내기)
  }
});

const socket = io();
const board = document.getElementById('game-board');
const rows= 10; //행의 수
const cols = 17; //열의 수

let mapData = []

socket.on('fulledRoom', () => {
  alert('방이 가득찼습니다!');
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

//사과 셀 생성
socket.emit('getMap');
console.log("맵을 요청 중입니다...");
socket.on('map', (data) => {
  DrawMap(data.mapData);
  mapData = data.mapData;
  console.log(data.mapData);
  console.log("맵을 받았습니다.");
});

socket.on('getScore', (result) => {
  console.log(result.userId);
  if (result.userId == socket.id) {
    const currentScore = getScore("user1");
    setScore("user1", currentScore + result.score);
    console.log(`${result.score} 점수를 얻었습니다.`);
  } else {
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
      endGame("승리하였습니다!\n" + data.message);
    } else if (data.winner == '') {
      game = false;
      endGame("비겼습니다!\n" + data.message);
    } else if (data.winner == ' ') {
      game = false;
      endGame("승리 당하셨습니다!\n" + data.message);
    } else {
      game = false;
      endGame("패배하였습니다!\n" + data.message);
    }
 }
});



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
  }
}

// 게임 종료 처리
function endGame(message) {
  alert(message);
  board.style.pointerEvents = "none";
  clearSelection();
  //게임 종료시 lobby로 이동
    setTimeout(() => {
        window.location.href = "lobby.html"; // 예: lobby.html로 이동
    }, 1000); // 1초 후 lobby로 이동
}

