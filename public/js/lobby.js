const socket = io();
const roomListBody = document.getElementById('room-list-body');


//lobby에서 각 row에서 Enter를 눌렀을 때 비빌번호 모듈이 뜰 수 있도록 함수 추가
let selectedRoomId=null;

function openPasswordModal(roomId){
  selectedRoomId=roomId;
  document.getElementById('password-modal').classList.remove('hidden'); //hidden으로 설정 된 비밀번호 입력 모듈이 보이게
  document.getElementById('room-password-input').value=''; //입력받은 password
  
}

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

      // 각 행에 들어갈 HTML 내용을 정의

      //1.생성자 이름이 추가되게 2번째 td에서 변경해야하고
      //2.Enter 버튼을 클릭했을 때 비밀번호 모듈이 뜨게도 코드를 변경하기 위해서 
      // joinRoom,deleteRoom 함수가 아닌 비밀번호 입력 모듈 함수로 변경 필요
      row.innerHTML = `
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">${room.title}</td>
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">userId</td>
        <td class="h-[72px] px-4 py-2 text-[#9e9e47] text-sm font-normal">1/2</td>
        <td class="h-[72px] px-4 py-2 text-sm font-bold tracking-[0.015em] flex gap-3 items-center">
      
          <button onclick="openPasswordModal('${room.id}')" class="text-[#9e9e47]">Enter</button>
          <button onclick="deleteRoom('${room.id}')" class="text-red-500">Delete</button>
        </td>
      `

      /*기존 row.innerHTML
       row.innerHTML = `
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">${room.title}</td>
        <td class="h-[72px] px-4 py-2 text-[#1c1c0d] text-sm font-normal">userId</td>
        <td class="h-[72px] px-4 py-2 text-[#9e9e47] text-sm font-normal">1/2</td>
        <td class="h-[72px] px-4 py-2 text-sm font-bold tracking-[0.015em] flex gap-3 items-center">
      
          <button onclick="joinRoom('${room.id}')" class="text-[#9e9e47]">Enter</button>
          <button onclick="deleteRoom('${room.id}')" class="text-red-500">Delete</button>
        </td>
      `
      */ 
      

    //Enter와 Delete 버튼 누르면 비빌번호 입력 모듈 뜨게 연결해야 함

    // 완성된 행을 tbody에 추가
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

document.getElementById('cancel-password-btn').addEventListener('click',()=>{
  document.getElementById('password-modal').classList.add('hidden');
  selectedRoomId=null;
})

//현재는 비밀번호를 입력하고 confirm 버튼을 누르면 사용자가 game.html로 이동
document.getElementById('confirm-password-btn').addEventListener('click',()=>{
  const password=document.getElementById('room-password-input').value;

  if(password.trim()==''){
    alert('비밀번호를 입력해주세요.');
    return;
  }
  //roomId는 사용자가 클릭한 방의 ID
  //password는 사용자가 입력한 비밀번호
  //두 값을 쿼리 파라미터로 넘겨받아서 game.html로 이동하게 되는 구조
  //현재는 비밀번호 검증없이 바로 이동
  //window.location.href=`game.html?roomId=${selectedRoomId}&password=${password}`;
  
  //waing.html로 이동하게 함
  window.location.href='waiting.html'

})
