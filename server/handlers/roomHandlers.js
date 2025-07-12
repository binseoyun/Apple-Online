const { v4: uuidv4 } = require('uuid');
const redisClient = require('redis');
const { isKeyObject } = require('util/types');

module.exports = (io, socket, redisClient) => {
    
}

async function handleCreateRoom(socket, redisClient, userInfo, data) {
    try {
        // 방 id 생성
        const roomId = uuidv4();

        // 방제 설정
        let title = "";
        if (data.title === "") {
            title = `${userInfo.nickname} 님의 게임`;
        } else {
            title = data.title;
        }

        // Redis에 방 정보(Hash) 저장
        await redisClient.hSet(roomId, {
            title: title,
            password: data.password,
            player1: userInfo.id,
            player2: null,
            status: 'waiting', // waiting과 playing으로 상태 구분
            createdAt: Date.now()
        });

        // 방 목록에 새로운 방 추가
        await redisClient.sAdd('rooms:waiting', roomKey);

        // 게임 중인 유저 목록에 새로운 유저 추가
        await redisClient.sAdd('waits', userInfo.id);

        // Socket.IO 방에 참여
        socket.join(roomId);

        // 제목 정규화 및 검색 DB에 저장
        const normalizedTitle = title.toLowerCase().replace(/\s/g, '');
        await redisClient.zAdd('rooms:title:index', {
            score: 0, // 점수는 모두 0으로 통일
            value: `${normalizedTitle}:${roomId}` // "정규화된제목:방ID" 형식으로 저장
          });

        // 서버 로그
        console.log(`[Room Created] ID: ${roomId} by ${userInfo.nickname}`);

        // 방 생성 완료 사실 전달
        socket.emit('roomCreated', { roomId });
    } catch (error) {
        console.error('방 생성 중 에러 발생:', error);
        socket.emit('error', { message: '방을 만드는 데 실패했습니다.' });
    }
}

async function handleJoinRoom(socket, redisClient, userInfo, data) {
    console.log(`[Room Join Start] To: ${roomId} by ${userInfo.nickname}`)

    // 방이 존재하는지 확인
    const RoomExists = await redisClient.sIsMember('rooms:waiting', data.roomId);
    if (!RoomExists) {
        return;
    }

    // 방 정보 불러오기
    const roomData = await redisClient.hGetAll(data.roodId);

    // 비밀번호가 일치하는지 확인
    if (roomData.password !== data.password) {
        return;
    }

    // 방에 빈자리가 있는지 확인
    if (roomData.status === 'waiting') {
        if (roomData.player1 === null) {
            // player1으로 등록
            roomData.player1 = userInfo.id;
        } else {
            // player2로 등록
            roomData.player2 = userInfo.id;
        }
        // 방 상태를 playing으로 변경
        roomData.status = 'playing';
    } else {
        return;
    }

    // Socket.IO 방에 참여
    socket.join(roomId);

    // 게임 중인 유저 목록에 새로운 유저 추가
    await redisClient.sAdd('waits', userInfo.id);
    await redisClient.sRem('rooms:waiting', data.roomId);
    await redisClient.sAdd('rooms:playing', data.roomId);

    // Redis에 방 정보(Hash) 갱신
    await redisClient.hSet(data.roomId, roomData);

    // 검색 리스트에서 제거
    const normalizedTitle = roomData.title.toLowerCase().replace(/\s/g, '');
    await redisClient.zRem('rooms:title:index', `${normalizedTitle}:${data.roomId}`);

    console.log(`[Room Join End] To: ${roomId} by ${userInfo.nickname}`);
}

async function handleDisconnect(socket, redisClient, userInfo, data) {
    console.log('❌ A user disconnected'); // 유저 접속 해제 시 메시지 출력

    // 방에 참여하고 있었는지 확인(게임을 진행 중이었는지)
    const hasRoom = await redisClient.sIsMember('waits', userInfo.id);
    if (!hasRoom) {
        return;
    }

    // 방 정보 불러오기
    const roomData = await redisClient.hGetAll(data.roodId);

    // roomId에 참여하는 유저인지 확인
    if ((roomData.player1 !== userInfo.id) && (roomData.player2 !== userInfo.id)) {
        return;
    }

    // ToDo: 방 상태가 playing이라면 -> 상대방이 게임을 종료하였습니다. 처리하기

    // 방 상태가 waiting이라면 탈퇴 후 방 제거
    if (roomData.status === 'waiting') {
        await redisClient.del(data.roomId);
    }

    // 방 목록 및 유저 목록에서 제거
    await redisClient.sRem('rooms:playing', data.roomId);
    await redisClient.sRem('rooms:waiting', data.roomId);
    await redisClient.sRem('fastRooms', data.roomId);
    await redisClient.sRem('waits', userInfo.id);
}

async function fastRoomGenerate(io, socket, redisClient, userInfo, data) {
    // 빠른 방 참여
    let roomId = await redisClient.sRandMember('fastRooms');

    // 방 존재 확인
    if (roomId === null) {
        // 빠른 방이 없다면 -> 방 생성 후 대기
        roomId = uuidv4();

        // Redis에 방 정보(Hash) 저장
        await redisClient.hSet(roomId, {
            title: userInfo.id,
            password: null,
            player1: userInfo.id,
            player2: null,
            status: 'waiting', // waiting과 playing으로 상태 구분
            createdAt: Date.now()
        });

        // Socket.IO Room에 등록
        socket.join(roomId);

        // 방 목록에 새로운 방 추가
        await redisClient.sAdd('fastRooms', roomKey);

        // 게임 중인 유저 목록에 새로운 유저 추가
        await redisClient.sAdd('waits', userInfo.id);
    } else {
        // 빠른 방이 존재한다면 -> 참여

        // 방 정보 불러오기
        const roomData = await redisClient.hGetAll(roodId);

        // 방 정보 수정 및 재등록
        roomData.player2 = userInfo.id;
        roomData.status = 'playing';
        await redisClient.hSet(roomId, roomData);

        // Socket.IO 방에 참여
        socket.join(roomId);

        // 게임 중인 유저 목록에 새로운 유저 추가
        await redisClient.sAdd('waits', userInfo.id);

        // Redis에 방 정보(Hash) 갱신
        await redisClient.hSet(data.roomId, roomData);

        // 방 목록 갱신
        await redisClient.sRem('fastRooms', roomId);
        await redisClient.sAdd('rooms:playing', roomKey);

        // 큐가 잡혔다는 사실을 알림
        io.to(roomId).emit('gameStart', {});
    }
}

async function getRoomList(redisClient) {
    // 방 제목 검색
    const waitingRooms = await redisClient.sMembers('rooms:waiting');

    return waitingRooms;
}

async function searchRooms(query, redisClient, userInfo, data) {
    // 방 제목 처리
    const normalizedQuery = query.toLowerCase().replace(/\s/g, '');

    if (!normalizedQuery) {
        return [];
    }

    // 범위 설정
    const startRange = `[${normalizedQuery}`;
    const endRange = `[${normalizedQuery}\xff`;

    // 검색 요청
    const results = await redisClient.zRangeByLex('rooms:title:index', startRange, endRange);

    // 자료 정리
    const roomInfos = results.map(result => {
        const parts = result.split(':');
        const title = parts.slice(0, -1).join(':');
        const roomId = parts[parts.length - 1];
        return { title, roomId };
    });

    return roomInfos;
}

async function gameEnds(io, redisClient, roomId) {
    // 방 제거

    // 유저 목록 불러오기
    const socketIds = await io.in(roomId).allSockets();

    // Socket.io의 room 제거
    socketIds.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(roomId);
        }
    });

    // 방 정보 제거
    await redisClient.del(data.roomId);

    // 방 목록 및 유저 목록에서 제거
    await redisClient.sRem('rooms:waiting', data.roomId);
    await redisClient.sRem('rooms:playing', data.roomId);
    await redisClient.sRem('fastRooms', data.roomId);
    await redisClient.sRem('waits', userInfo.id);
}

module.exports = {
    handleCreateRoom,
    handleJoinRoom,
    handleDisconnect,
    fastRoomGenerate,
    getRoomList,
    searchRooms,
    gameEnds,
}