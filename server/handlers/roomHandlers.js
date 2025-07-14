const { v4: uuidv4 } = require('uuid');
const redisClient = require('redis');
const { isKeyObject } = require('util/types');

const gameLogic = require('./gameLogic');
const { STATUS_CODES } = require('http');

const gameStates = {}; // { roomid: { timeLeft: 60, timerId: <setInterval_ID>, scores: {player1: 0, player2: 0} } ... }

const registerRoomsHandlers = async (io, socket, redisClient) => {
    /** 
     * 방 관리
     * @param {object} data - { title: string, password: string }
     * @param {object} userInfo - { id: string, nickname: string }
    */

    const session = socket.request.session;
    const userId = session.passport.user;
    
    const handleCreateRoom = async (data, userInfo) => {
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
                player2: '',
                status: 'waiting', // waiting과 playing으로 상태 구분
                createdAt: Date.now().toString()
            });

            // 방 목록에 새로운 방 추가
            await redisClient.sAdd('rooms:waiting', roomId);

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
            io.to('lobby').emit('newRoom', {id: roomId, title: title, maker: userInfo.id, createdAt: Date.now().toString()});
        } catch (error) {
            console.error('방 생성 중 에러 발생:', error);
            socket.emit('error', { message: '방을 만드는 데 실패했습니다.' });
        }
    };

    const handleJoinRoom = async (userInfo, data) => {
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
            if (roomData.player1 === '') {
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
    };

    const handleDisconnect = async () => {
        console.log('❌ A user disconnected'); // 유저 접속 해제 시 메시지 출력

        const roomId = findRoomBySocket(socket);

        // 방에 참여하고 있었는지 확인(게임을 진행 중이었는지)
        const hasRoom = await redisClient.sIsMember('waits', userId);
        if (!hasRoom) {
            return;
        }

        // 방 정보 불러오기
        const roomData = await redisClient.hGetAll(roomId);

        // roomId에 참여하는 유저인지 확인
        if ((roomData.player1 !== userInfo.id) && (roomData.player2 !== userId)) {
            return;
        }

        // ToDo: 방 상태가 playing이라면 -> 상대방이 게임을 종료하였습니다. 처리하기
        if (roomId && gameStates[roomId]) {
            clearInterval(gameStates[roomId].timerId);
            delete gameStates[roomId];

            io.to(roomId).emit('gameEnd', {message: `플레이어가 퇴장하여 게임이 종료되었습니다.`});
        }

        // 방 상태가 waiting이라면 탈퇴 후 방 제거
        if (roomData.status === 'waiting') {
            await redisClient.del(roomId);
        }

        // 방 목록 및 유저 목록에서 제거
        await redisClient.sRem('rooms:playing', roomId);
        await redisClient.sRem('rooms:waiting', roomId);
        await redisClient.sRem('fastRooms', roomId);
        await redisClient.sRem('waits', userId);

        io.to('lobby').emit('deleteRoom', roomId);
    };

    const fastRoomGenerate = async (userInfo, data) => {
        // 빠른 방 참여
        let roomId = await redisClient.sRandMember('fastRooms');

        // 방 존재 확인
        if (roomId === null) {
            // 빠른 방이 없다면 -> 방 생성 후 대기
            roomId = uuidv4();

            // Redis에 방 정보(Hash) 저장
            await redisClient.hSet(roomId, {
                title: userInfo.id,
                password: '',
                player1: userInfo.id,
                player2: '',
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
    };

    const getRoomList = async () => {
        // 방 제목 검색
        try {
            const waitingRooms = await redisClient.sMembers('rooms:waiting');
            
            const roomDetailsPromises = waitingRooms.map(id => redisClient.hGetAll(id));
            const roomDetailsArray = await Promise.all(roomDetailsPromises);

            const roomsForClient = waitingRooms.map((id, index) => {
                const details = roomDetailsArray[index];

                return {
                    id: id,
                    title: details.title
                };
            });

            socket.emit('initialRoomList', roomsForClient);
        } catch (error) {
            console.error('방 목록 조회 중 오류가 발생하였습니다.', error);
            socket.emit('error', { message: '방 목록을 불러오는 데 실패했습니다.' });
        }
    };

    const searchRooms = async (query, userInfo, data) => {
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
    };

    const startGame = async(roomId) => {
        try {
            socket.join(roomId);
            console.log(`${userId} joined ${roomId}`);

            const roomData = await redisClient.hGetAll(roomId);

            if (roomData.status === 'waiting') {
                roomData.status = 'playing';
                gameStates[roomId] = {
                    timeLeft: null,
                    timerId: null,
                    player1: userId,
                    player2: null,
                    score1: 0,
                    score2: 0
                };
                await redisClient.hSet(roomId, roomData);
            } else {
                if (gameStates[roomId].player2 !== null) {
                    socket.emit('fulledRoom');
                    return;
                }

                SendMap(roomId);

                gameStates[roomId].timeLeft = 60;
                gameStates[roomId].player2 = userId;

                const timerId = setInterval(() => {
                    const roomState = gameStates[roomId];

                    if (roomState && roomState.timeLeft > 0) {
                        roomState.timeLeft--;
                        io.to(roomId).emit('updateTime', { timeLeft: roomState.timeLeft });
                    } else {
                        clearInterval(timerId);

                        let winner = '';
                        if (gameStates[roomId].score1 > gameStates[roomId].score2) {
                            winner = gameStates[roomId].player1;
                        } else if (gameStates[roomId].score1 < gameStates[roomId].score2) {
                            winner = gameStates[roomId].player2;
                        } else {
                            winner = '';
                        }

                        io.to(roomId).emit('gameEnd', { message: `시간이 종료되었습니다!`, winner: winner });

                        delete gameStates[roomId];
                        endGame(roomId);
                    }
                }, 1000);

                gameStates[roomId].timerId = timerId;

                console.log(`${roomId}의 타이머가 시작되었습니다.`);
            }
        } catch (error) {
            socket.emit('fulledRoom');
            handleDeleteRoom(redisClient, roomId);
        }
    };

    const endGame = async(roomId) => {
        handleDeleteRoom(redisClient, roomId);
    }

    const SendMap = async (roomId) => {
        const Map = gameLogic.createMap();

        const initialMapFields = {};
        Map.forEach((row, r_idx) => {
            row.forEach((value, c_idx) => {
                initialMapFields[`${r_idx}-${c_idx}`] = value.toString();
            });
        });

        // roomid 받아서 하는 걸로 수정 요망
        await redisClient.hSet(`game:map:${roomId}`, initialMapFields);

        io.to(roomId).emit('map', {
            mapData: Map
        });
    };

    const dragApples = async (x1, y1, x2, y2, roomId, userId) => {
        // 나중에 mapdata를 서버에 저장하고 불러와야함.
        try {
            const mapDataLoad = await redisClient.hGetAll(`game:map:${roomId}`);

            const mapData = [];
            for (let i=0; i<10; i++) {
                const temp = [];
                for (let j=0; j<17; j++) {
                    temp.push(mapDataLoad[`${i}-${j}`]);
                }
                mapData.push(temp);
            }
    
            const apple_list = gameLogic.dragApple(x1, y1, x2, y2, mapData);
            const result = gameLogic.calculateScore(apple_list, mapData);
    
            if (result > 0) {  
                for (let i = Math.min(x1, x2); i <= Math.max(x1, x2); i++) {
                    for (let j = Math.min(y1, y2); j <= Math.max(y1, y2); j++) {
                        await redisClient.hSet(`game:map:${roomId}`, `${j}-${i}`, '0');
                    }
                }
    
                if (gameStates[roomId].player1 == userId) {
                    const currentScore = gameStates[roomId].score1;
                    gameStates[roomId].score1 = currentScore + result;
                } else {
                    const currentScore = gameStates[roomId].score2;
                    gameStates[roomId].score2 = currentScore + result;
                }
                
                io.to(roomId).emit('getScore', {
                    score: result,
                    userId: userId
                });
                io.to(roomId).emit('deleteApple', {
                    row1: x1, col1: y1, row2: x2, col2: y2
                });
            }
        } catch {}
    };


    socket.on('createRoom', handleCreateRoom);
    socket.on('getRoomList', getRoomList);

    socket.on('joinRoom', joinRoom);
    socket.on('startGame', startGame);
    socket.on('dragApples', dragApples);
};

const handleDeleteRoom = async (redisClient, roomId) => {
    // 방 정보 불러오기
    const roomData = await redisClient.hGetAll(roomId);

    // 방 목록 및 유저 목록에서 제거
    await redisClient.sRem('rooms:playing', roomId);
    await redisClient.sRem('rooms:waiting', roomId);
    await redisClient.sRem('fastRooms', roomId);
    await redisClient.del(roomId);

    // todo: 유저 제거
};


module.exports = {
    registerRoomsHandlers,
    handleDeleteRoom
}