function createRoom() {
      const roomName = document.getElementById("roomName").value.trim();

      if (!roomName) {
        alert("Please enter a room name!");
        return;
      }

      // 임시: 실제로는 서버에 POST 요청을 보내거나 로컬에 저장할 수 있음
      console.log("Room created:", roomName);

      // 다시 로비로 이동
      window.location.href = "lobby.html";
    }