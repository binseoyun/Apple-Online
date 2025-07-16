//js/game.js

document.addEventListener('DOMContentLoaded', async () => {
    const socket = io("https://www.applegame.shop", {
        withCredentials: true
    });
    const userId = await getMyUserId();
    let roomId = '';

    let password = '';
    let mode = '';
    const urlParams = new URLSearchParams(window.location.search);

    roomId = urlParams.get('roomId');
    password = urlParams.get('password');
    mode = urlParams.get('mode');

    function backtoLobby() {
        if (mode === 'join') {
            socket.emit('outRoom', roomId);
        } else if (mode === 'fast') {
            socket.emit('outFastRoom');
        } else {
            window.location.href = `lobby.html`;
        }
    }
    window.backtoLobby = backtoLobby;

    if (!roomId || !mode) {
        alert('부적절한 접근입니다!');
        window.location.href = 'lobby.html';
        return;
    }

    try {
    if (mode === 'join') {
        socket.emit('joinRoom', roomId, password);
    } else if (mode === 'delete') {
        socket.emit('deleteRoom', roomId, password);
    } else if (mode === 'fast') {
        socket.emit('fastGame');
    } else {
        alert('부적절한 접근입니다!');
        window.location.href = `lobby.html`;
        return;
    }
    } catch(error) {
        alert('일시적으로 오류가 발생하였습니다!');
        window.location.href = `lobby.html`;
        return;
    }

    socket.on('whatareyoudoing', () => {
        window.location.href = 'whatareyoudoing.html';
    });
    
    socket.on('fulledRoom', () => {
        alert('방이 가득찼습니다!');
        window.location.href = `lobby.html`;
    });
    
    socket.on('DeleteRoom', () => {
        alert('방을 성공적으로 삭제하였습니다!');
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
    
    socket.on('startGame', () => {
        window.location.href = `game.html?roomId=${roomId}`;
    });

    socket.on('startFastGame', (roomid) => {
        window.location.href = `game.html?roomId=${roomid}`;
    });
    
    socket.on('outRoom', () => {
        window.location.href='lobby.html';
    });
});