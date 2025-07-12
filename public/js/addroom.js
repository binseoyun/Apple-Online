const socket = io();

//Create 버튼 클릭 시 비밀번호 입력창이 뜨게 변경함

//Create 버튼 요소 가져옴
const preview = document.getElementById('createRoom');



function createRoom(hasPW) {
  const roomName = document.getElementById("roomName").value.trim();

  if (!roomName) {
    alert("Please enter a room name!");
    return;
  }

  // 임시: 실제로는 서버에 POST 요청을 보내거나 로컬에 저장할 수 있음
  let password = '';
  if (hasPW) {
    const passwordInput = document.getElementById('roomPassword').value.trim();
    password = passwordInput
  }
  socket.emit('createRoom', {title: roomName, password: password}, {id: socket.id, nickname: "nick"});
  
  console.log("Room created:", roomName);

  // 다시 로비로 이동
  window.location.href = "lobby.html";
}

