function deleteRow(btn) {
  const row = btn.closest('tr');
  if (confirm("Are you sure you want to delete this room?")) {
    row.remove();
  }
}

function joinRoom(roomId) {
  window.location.href = `game.html?roomId=${roomId}`;
}

(async () => {
  const userId = await getMyUserId();

  if (!userId) {
    console.log("User ID not found, stopping script.");
    return;
  } else {
    console.log(`I am ${userId}`);
  }


  const socket = io("https://www.applegame.shop", {
    withCredentials: true
  });
  const roomListBody = document.getElementById('room-list-body');

  socket.emit('joinLobby');

  function drawRoomList(data) {
    roomListBody.innerHTML = '';

    if (data.length > 0) {
      data.forEach(room => {
        // 각 방 정보를 바탕으로 새로운 테이블 행(<tr>)을 생성합니다.
        const row = document.createElement('tr');
        row.id = `room-${room.id}`;
        row.className = 'border-t border-t-[#e9e9ce]'; // Tailwind CSS 클래스 적용

        // 각 행에 들어갈 HTML 내용을 정의
        row.innerHTML = `
          <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">${room.title}</td>
          <td class="h-[72px] px-4 py-2 text-[#9e9e47] text-sm font-normal">1/2</td>
          <td class="h-[72px] px-4 py-2 text-sm font-bold tracking-[0.015em] flex gap-3 items-center">
            <button onclick="joinRoom('${room.id}')" class="text-[#9e9e47]">Enter</button>
            <button onclick="deleteRoom('${room.id}')" class="text-red-500">Delete</button>
          </td>
        `
        

      //Enter와 Delete 버튼 누르면 비빌번호 입력 모듈 뜨게 연결해야 함

      

        // 완성된 행을 tbody에 추가
        roomListBody.appendChild(row);
      });
    } else {
      // 방이 하나도 없을 경우 표시할 메시지
      const noRoomsRow = document.createElement('tr');
      noRoomsRow.className = 'no-rooms'; // 쉽게 찾을 수 있도록 클래스 추가
      noRoomsRow.innerHTML = `<td colspan="3" class="h-[72px] text-center text-[#9e9e47]">아직 생성된 방이 없습니다.</td>`;
      roomListBody.appendChild(noRoomsRow);
    }
  }

  function addRoom(room) {
    const noRoomsRow = roomListBody.querySelector('.no-rooms');
    if (noRoomsRow) {
      noRoomsRow.remove();
    }

    const row = document.createElement('tr');
    row.id = `room-${room.id}`;
    row.className = 'border-t border-t-[#e9e9ce]';
    row.innerHTML = `
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">${room.title}</td>
        <td class="h-[72px] px-4 py-2 text-[#9e9e47] text-sm font-normal">1/2</td>
        <td class="h-[72px] px-4 py-2 text-sm font-bold tracking-[0.015em] flex gap-3 items-center">
            <button onclick="joinRoom('${room.id}')" class="text-[#9e9e47]">Enter</button>
            <button onclick="deleteRoom('${room.id}')" class="text-red-500">Delete</button>
        </td>
    `;
    roomListBody.appendChild(row);
  }

  function removeRoom(roomId) {
    const rowToRomove = document.getElementById(`room-${roomId}`);
    if (rowToRomove) {
      rowToRomove.remove();
    }
    if (roomListBody.children.length === 0) {
      const noRoomsRow = document.createElement('tr');
      noRoomsRow.className = 'no-rooms'; // 쉽게 찾을 수 있도록 클래스 추가
      noRoomsRow.innerHTML = `<td colspan="3" class="h-[72px] text-center text-[#9e9e47]">아직 생성된 방이 없습니다.</td>`;
      roomListBody.appendChild(noRoomsRow);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    socket.emit('getRoomList');
  });

  socket.on('initialRoomList', (data) => {
    console.log(data);
    try {
      drawRoomList(data);
    } catch(error) {
      console.log("방 목록을 불러오지 못했습니다.", error);
    }
  });

  socket.on('newRoom', (room) => {
    console.log('New room created:', room);
    addRoom(room);
  });

  socket.on('deleteRoom', (roomId) => {
    console.log('Room deleted:', roomId);
    removeRoom(roomId);
  });
})();