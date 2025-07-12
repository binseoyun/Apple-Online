//js/game.js

   //게임 보드를 가지고 옴
      const board = document.getElementById('game-board');
      const rows= 10; //행의 수
      const cols = 17; //열의 수

      //사과 셀 생성
      for (let i = 0; i < 17*10;i++) { //17X10 = 170개 셀 생성
        const cell = document.createElement('div'); //각 셀은 div 요소로 생성
        const num = Math.floor(Math.random() * 9) + 1;
        cell.textContent = num;
        cell.className = //Tailwind CSS 클래스를 사용하여 스타일링
        //셀크기, 사과 이미지, 숫자 스타일, 숫자 가운데 정렬, 원형, 마우스 반응
          'w-[40px] h-[40px] bg-[url("https://cdn-icons-png.flaticon.com/512/590/590685.png")] bg-cover bg-center text-white text-sm font-bold flex items-center justify-center rounded-full cursor-pointer hover:scale-105 transition-transform';
        cell.setAttribute('data-value', num); //숫자 값을 data-value 속성에 저장
        board.appendChild(cell); //완성된 셀을 보드에 추가
      }

      //드레그 관련 변수 및 함수
      let isDragging = false; //드래그 상태를 추적
      let selectedCells = []; //선택된 셀을 저장하는 배열   
      let startCell = null; //드래그 시작 셀

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
  clearSelection(); 
  startCell = e.target; //드레그 시작 셀 지정
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

//드래그 중 마우스 이동(박스 크기 선택)
board.addEventListener("mouseover", (e) => {
  if (!isDragging || e.target.parentElement !== board) return;
  const currRect = e.target.getBoundingClientRect();

const x = Math.min(dragStartX, currRect.left);
const y = Math.min(dragStartY, currRect.top);
const width = Math.abs(currRect.left - dragStartX);
const height = Math.abs(currRect.top - dragStartY);

dragBox.style.left = `${x}px`;
dragBox.style.top = `${y}px`;
dragBox.style.width = `${width + currRect.width}px`;
dragBox.style.height = `${height + currRect.height}px`;



  if (!startCell) return;

  const index1 = [...board.children].indexOf(startCell);
  const index2 = [...board.children].indexOf(e.target);

  const row1 = Math.floor(index1 / cols);
  const col1 = index1 % cols;
  const row2 = Math.floor(index2 / cols);
  const col2 = index2 % cols;

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

function clearSelection() {
  selectedCells.forEach((cell) => cell.classList.remove("selected"));
  selectedCells = [];
  startCell = null;
}

//합이 10인지 확인하는 함수
function checkSum() {


const sum = selectedCells.reduce(
    (acc, cell) => acc + Number(cell.dataset.value),
    0
  );
  console.log("선택된 합계:", sum);

//user가 선택한 셀의 합이 10일때마다 1점씩 상승
  if (sum === 10) {
    const addedScore=1; 
    const currentScore = getScore("user1"); //user1의 점수 가져오기
    setScore("user1", currentScore + addedScore); //점수 업데이트(user가 성공하면 10을 맞춘거니깐 1을 더하게)

    alert("🍎 숫자의 합이 10입니다!");
    selectedCells.forEach((cell) => {
        cell.textContent=""; //셀의 숫자 제거
        cell.classList.remove("apple"); //사과 클래스 제거
        cell.style.backgroundImage="none"; //사과 이미지 제거
        cell.removeAttribute("data-value"); //data-value 속성 제거
        cell.classList.remove("selected"); //선택된 클래스 제거
      
      
    });
    // 점수 증가, 셀 제거 또는 효과 적용 가능
  } else {
    clearSelection();
  }
}

function isAllowedDirection(startRow, startCol, currRow, currCol) {
  const rowDiff = currRow - startRow;
  const colDiff = currCol - startCol;
  return (
    rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)
  );
}
  
//점수 업데이트 함수

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

//  타이머 
let timeLeft = 60; //게임 진행 시간 60초
const timerText = document.getElementById("timer-text");
const timerBar = document.getElementById("timer-bar");

let timerInterval = setInterval(() => {
  timeLeft--;
  updateTimerUI();

  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    endGame("시간이 종료되었습니다");
  }
}, 1000);

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

