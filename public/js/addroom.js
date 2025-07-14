(async () => {
  const socket = io("https://www.applegame.shop", {
    withCredentials: true
  });
  const userId = await getMyUserId();

  //Create 버튼 요소 가져옴
  const preview = document.getElementById('createRoom');

  function createRoom(hasPW) {
    let roomName = document.getElementById("roomName").value.trim();

    if (!roomName) {
      roomName = '';
    }

    // 임시: 실제로는 서버에 POST 요청을 보내거나 로컬에 저장할 수 있음
    let password = '';
    if (hasPW) {
      const passwordInput = document.getElementById('roomPassword').value.trim();
      password = passwordInput
    }
    socket.emit('createRoom', {title: roomName, password: password}, {id: userId});

    socket.on('whatareyoudoing', () => {
      window.location.href = 'whatareyoudoing.html';
    });

    socket.on('roomCreated', (data) => {
      window.location.href = `wating.html?roomId=${data.id}&password=${password}&mode=join`;
    });
  }

  window.createRoom = createRoom;
})();