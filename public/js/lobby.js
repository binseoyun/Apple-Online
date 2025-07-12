const socket = io();
const roomListBody = document.getElementById('room-list-body');

function deleteRow(btn) {
  const row = btn.closest('tr');
  if (confirm("Are you sure you want to delete this room?")) {
    row.remove();
  }
}

function joinRoom(roomId) {
  window.location.href = `game.html?roomId=${roomId}`;
}

function drawRoomList(data) {
  if (data.length > 0) {
    data.forEach(room => {
      // 각 방 정보를 바탕으로 새로운 테이블 행(<tr>)을 생성합니다.
      const row = document.createElement('tr');
      row.className = 'border-t border-t-[#e9e9ce]'; // Tailwind CSS 클래스 적용

      // 각 행에 들어갈 HTML 내용을 정의합니다.
      row.innerHTML = `
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">${room.title}</td>
        <td class="h-[72px] px-4 py-2 text-[#9e9e47] text-sm font-normal">1/2</td>
        <td class="h-[72px] px-4 py-2 text-sm font-bold tracking-[0.015em] flex gap-3 items-center">
          <button onclick="joinRoom('${room.id}')" class="text-[#9e9e47]">Enter</button>
          <button onclick="deleteRoom('${room.id}')" class="text-red-500">Delete</button>
        </td>
      `

      //room

      // 완성된 행을 tbody에 추가합니다.
      roomListBody.appendChild(row);
    });
  } else {
    // 방이 하나도 없을 경우 표시할 메시지
    const noRoomsRow = document.createElement('tr');
    noRoomsRow.innerHTML = `<td colspan="3" class="h-[72px] text-center text-[#9e9e47]">아직 생성된 방이 없습니다.</td>`;
    roomListBody.appendChild(noRoomsRow);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  socket.emit('getRoomList');
});

socket.on('updateRoomList', (data) => {
  console.log(data);
  drawRoomList(data);
});