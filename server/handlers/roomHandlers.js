const { v4: uuidv4 } = require('uuid');
const redisClient = require('redis');
const { isKeyObject } = require('util/types');
const userController = require('../controllers/userController')
const { pool } = require('../../config/db');

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
            const isUserWaiting = await redisClient.sIsMember('waits', String(userId));
            if (isUserWaiting) {
                socket.emit('whatareyoudoing');
                return;
            }
            // 방 id 생성
            const roomId = uuidv4();

            // 방제 설정
            let title = "";
            const nickname = await userController.getUserNickname(userId);
            if (data.title === "") {
                title = `${nickname} 님의 게임`;
            } else {
                title = data.title;
            }

            // Redis에 방 정보(Hash) 저장
            await redisClient.hSet(roomId, {
                title: title,
                nickname: nickname,
                password: data.password,
                player1: '',
                player2: '',
                status: 'waiting', // waiting과 playing으로 상태 구분
                createdAt: Date.now().toString()
            });

            // 방 목록에 새로운 방 추가
            await redisClient.sAdd('rooms:waiting', String(roomId));

            // Socket.IO 방에 참여
            socket.join(roomId);

            // 제목 정규화 및 검색 DB에 저장
            const normalizedTitle = title.toLowerCase().replace(/\s/g, '');
            await redisClient.zAdd('rooms:title:index', {
                score: 0, // 점수는 모두 0으로 통일
                value: `${normalizedTitle}:${roomId}` // "정규화된제목:방ID" 형식으로 저장
            });

            // 서버 로그
            console.log(`[Room Created] ID: ${roomId} by ${nickname}`);

            // 방 생성 완료 사실 전달
            socket.emit('roomCreated', {id: roomId, title: title, maker: nickname, createdAt: Date.now().toString()});
            io.to('lobby').emit('newRoom', {id: roomId, title: title, maker: nickname, createdAt: Date.now().toString()});
        } catch (error) {
            console.error('방 생성 중 에러 발생:', error);
            socket.emit('error', { message: '방을 만드는 데 실패했습니다.' });
        }
    };

    const fastRoomGenerate = async () => {
        // 빠른 방 참여
        let roomId = await redisClient.sRandMember('fastRooms');

        // 방 존재 확인
        if (roomId === null) {
            // 빠른 방이 없다면 -> 방 생성 후 대기
            roomId = uuidv4();

            // Redis에 방 정보(Hash) 저장
            await redisClient.hSet(roomId, {
                title: `fastRoom of ${userId}`,
                nickname: '',
                password: '',
                player1: userId,
                player2: '',
                status: 'waiting', // waiting과 playing으로 상태 구분
                createdAt: Date.now().toString()
            });

            // Socket.IO Room에 등록
            socket.join(roomId);

            // 방 목록에 새로운 방 추가
            await redisClient.sAdd('fastRooms', String(roomId));

            // 게임 중인 유저 목록에 새로운 유저 추가
            await redisClient.sAdd('waits', String(userId));
        } else {
            // 빠른 방이 존재한다면 -> 참여

            // 방 정보 불러오기
            const roomData = await redisClient.hGetAll(String(roomId));

            // 방 정보 수정 및 재등록
            roomData.player2 = userId;
            roomData.status = 'playing';
            await redisClient.hSet(roomId, roomData);

            // Socket.IO 방에 참여
            socket.join(roomId);

            // 게임 중인 유저 목록에 새로운 유저 추가
            await redisClient.sAdd('waits', String(userId));

            // Redis에 방 정보(Hash) 갱신
            await redisClient.hSet(roomId, roomData);

            // 방 목록 갱신
            await redisClient.sRem('fastRooms', roomId);
            await redisClient.sAdd('rooms:playing', roomId);

            gameStates[roomId] = {
                timeLeft: null,
                timerId: null,
                player1: roomData.player1,
                player2: roomData.player2,
                score1: 0,
                score2: 0,
                loading: 0
            }

            // 큐가 잡혔다는 사실을 알림
            io.to(roomId).emit('startFastGame', roomId);
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
                    title: details.title,
                    maker: details.nickname,
                    createdAt: details.createdAt
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

    const joinRoom = async(roomId, password) => {
        try {
            const isUserWaiting = await redisClient.sIsMember('waits', String(userId));
            if (isUserWaiting) {
                const roomData = await redisClient.hGetAll(roomId);
                if ((roomData.player1 === String(userId)) || (roomData.player2 === String(userId))) {
                    // 재접속
                    return;
                }
                socket.emit('whatareyoudoing');
                return;
            }

            const roomData = await redisClient.hGetAll(roomId);

            if (!roomData) {
                console.log('존재하지 않는 방입니다.');
                return;
            }

            if (roomData.status === 'playing') {
                socket.emit('PlayingRoom');
                return;
            }

            if (roomData.password !== password) {
                socket.emit('BlockedRoom');
                return;
            }

            if (roomData.player1 === '') {
                roomData.player1 = userId;
                socket.join(roomId);
            } else if (roomData.player2 === '') {
                roomData.player2 = userId;
                socket.join(roomId);
            } else if ((roomData.player1 === userId) || (roomData.player2 === userId)) {
                console.log(`다시 방으로 복귀한 ${userId}`);
                return;
            } else {
                socket.emit('fulledRoom');
                return;
            }

            await redisClient.hSet(roomId, roomData);
            await redisClient.set(`user-${userId}-room`, roomId);
            console.log(`${userId} joined ${roomId}`);

            // 게임 중인 유저 목록에 새로운 유저 추가\
            await redisClient.sAdd('waits', String(userId));

            if ((roomData.player1 !== '') && (roomData.player2 !== '')) {
                // 게임 시작
                startGame(roomId);
                io.to(roomId).emit('startGame');
            }
        } catch (error) {
            console.log('error', error);
            socket.emit('fulledRoom');
        }
    };

    const startGame = async(roomId) => {
        try {
            const roomData = await redisClient.hGetAll(String(roomId));
            roomData.status = 'playing';
            await redisClient.hSet(roomId, roomData);
            await redisClient.sRem('rooms:waiting', roomId);
            await redisClient.sAdd('rooms:playing', roomId);
            io.to('lobby').emit('deleteRoom', String(roomId));

            gameStates[roomId] = {
                timeLeft: null,
                timerId: null,
                player1: roomData.player1,
                player2: roomData.player2,
                score1: 0,
                score2: 0,
                loading: 0
            }
            const normalizedTitle = roomData.title.toLowerCase().replace(/\s/g, '');
            await redisClient.zRem('rooms:title:index', `${normalizedTitle}:${roomId}`);
            console.log(`${roomId} started the game.`);
        } catch (error) {
            handleDeleteRoom(io, redisClient, roomId);
        }
    };

    const getGame = async (userId, roomId) => {
        console.log(`${userId}로 부터 게임 시작 요청이 들어왔습니다.`);
        try {
            const roomData = await redisClient.hGetAll(roomId);

            if (!roomData) {
                socket.emit('what?');
                return;
            }

            if (roomData.status !== 'playing') {
                return;
            }

            if ((roomData.player1 !== userId) && (roomData.player2 !== userId)) {
                socket.emit('what?');
                return;
            }

            socket.join(roomId);

            if (gameStates[roomId].loading === 1) {
                await SendMap(roomId);
                return;
            }

            io.in(roomId).allSockets().then(async sockets => {
                gameStates[roomId].loading += 1;
                if (gameStates[roomId].loading === 1) {
                    await SendMap(roomId);

                    gameStates[roomId].timeLeft = 60;
                    const timerId = setInterval(async () => {
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
        
                            await redisClient.sRem('waits', String(gameStates[roomId].player1));
                            await redisClient.sRem('waits', String(gameStates[roomId].player2));

                            endGame(roomId);
                        }
                    }, 1000);
                } else {
                    console.log(`User들의 game.html 로딩을 기다리는 중...`, gameStates[roomId].loading);
                }
              })
        } catch (error) {
            socket.emit('what?');
            console.log(error);
        }
    };

    const endGame = async (roomId) => {
        const roomData = await redisClient.hGetAll(roomId);

        const player1_id = roomData.player1;
        const player2_id = roomData.player2;

        const player1_data = await userController.getProfile(player1_id);
        const player2_data = await userController.getProfile(player2_id);

        let winner_id_for_sql = 0;
        let winner_id_for_client = 0;
        let winner = 0;
        if (gameStates[roomId].score1 > gameStates[roomId].score2) {
            winner_id_for_sql = gameStates[roomId].player1;
            winner_id_for_client = gameStates[roomId].player1;
            winner = 1;
        } else if (gameStates[roomId].score1 < gameStates[roomId].score2) {
            winner_id_for_sql = gameStates[roomId].player2;
            winner_id_for_client = gameStates[roomId].player2;
            winner = 2;
        } else {
            winner_id_for_sql = null;
            winner_id_for_client = '';
            winner = 0;
        }

        const player1_old_elo = player1_data.elo_rating;
        const player2_old_elo = player2_data.elo_rating;

        const new_elo = userController.calculateElo(player1_old_elo, player2_old_elo, winner);

        let player1_new_elo = new_elo.newRatingA;
        let player2_new_elo = new_elo.newRatingB;
        console.log(`${roomId}의 게임이 종료되었습니다.(승자 ${winner_id_for_client})`);
        io.to(roomId).emit('gameEnd', { message: `시간이 종료되었습니다!`, winner: winner_id_for_client, elo_A: player1_new_elo - player1_old_elo, elo_B: player2_new_elo - player2_old_elo, player1: player1_id, player2: player2_id});

        // 게임 전적 기록하기
        const insertSql = 'INSERT INTO GameRecords (player1_id, player2_id, winner_id, player1_old_elo, player1_new_elo, player2_old_elo, player2_new_elo) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(insertSql, [player1_id, player2_id, winner_id_for_sql, player1_old_elo, player1_new_elo, player2_old_elo, player2_new_elo]);

        // 유저 레이팅 변경하기
        await userController.updateUserElo(player1_id, player1_new_elo);
        await userController.updateUserElo(player2_id, player2_new_elo);

        delete gameStates[roomId];
        handleDeleteRoom(io, redisClient, roomId);
    }

    const SendMap = async (roomId) => {
        const roomData = await redisClient.hGetAll(roomId);
        let user1 = '';
        let user2 = '';
        let score1 = '';
        let score2 = '';
        let image1 = '';
        let image2 = '';
        const user1Data = await userController.getProfile(roomData.player1);
        const user2Data = await userController.getProfile(roomData.player2);
        user1 = user1Data.nickname;
        user2 = user2Data.nickname;
        score1 = gameStates[roomId].score1;
        score2 = gameStates[roomId].score2;
        image1 = user1Data.profile_image_url;
        image2 = user2Data.profile_image_url;


        // map 정보 불러오기
        const pastMap = await redisClient.hGetAll(`game:map:${roomId}`);
        if (Object.keys(pastMap).length !== 0) {
            let sendMap = [];
            for (let i = 0; i < 10; i++) {
                const newRow = []
                for (let j = 0; j < 17; j++) {
                    newRow.push(pastMap[`${i}-${j}`]);
                }
                sendMap.push(newRow);
            }
            socket.emit('map', {
                mapData: sendMap,
                user1: user1,
                user2: user2,
                score1: score1,
                score2: score2,
                image1: image1,
                image2: image2,
                rating1: user1Data.elo_rating,
                rating2: user2Data.elo_rating,
                userId: roomData.player1
            });
            return;
        }

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
            mapData: Map,
            user1: user1,
            user2: user2,
            score1: score1,
            score2: score2,
            image1: image1,
            image2: image2,
            rating1: user1Data.elo_rating,
            rating2: user2Data.elo_rating,
            userId: roomData.player1
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
                
                let num = 0;
                if (gameStates[roomId].player1 == userId) {
                    const currentScore = gameStates[roomId].score1;
                    gameStates[roomId].score1 = currentScore + result;
                    num = 1;
                } else {
                    const currentScore = gameStates[roomId].score2;
                    gameStates[roomId].score2 = currentScore + result;
                    num = 2;
                }
                
                io.to(roomId).emit('getScore', {
                    score: result,
                    userId: userId,
                    num: num
                });
                io.to(roomId).emit('deleteApple', {
                    row1: x1, col1: y1, row2: x2, col2: y2, userId: userId
                });
            }
        } catch {}
    };

    socket.on('deleteRoom', async (roomId, password) => {
        try {
            const roomData = await redisClient.hGetAll(roomId);

            if (roomData.password !== password) {
                socket.emit('BlockedRoom');
                return;
            }

            handleDeleteRoom(io, redisClient, roomId);
            io.to(roomId).emit('DeleteRoom');
            socket.emit('DeleteRoom');
        } catch (error) {
            socket.emit('BlockedRoom');
        }
    });

    socket.on('outRoom', async (roomId) => {
        const roomData = await redisClient.hGetAll(roomId);
        if (roomData.player1 === String(userId)) {
            await handleDeleteRoom(io, redisClient, roomId);
            socket.emit('outRoom');
        }
    });

    socket.on('disconnecting', async () => {
        try {
            const isUserWaiting = await redisClient.sIsMember('waits', String(userId));
        } catch (error) {

        }
    });

    socket.on('disconnect', async () => {
        setTimeout(() => {
            io.in(userId).allSockets().then(async sockets => {
            if (sockets.size === 0) {
                console.log(`❌ A user disconnected: ${userId}`);
                try {
                    const isUserWaiting = await redisClient.sIsMember('waits', String(userId));
                    const roomId = await redisClient.get(`user-${userId}-room`);
                    const roomData = await redisClient.hGetAll(String(roomId));
                    if (roomData.status === 'waiting') {
                        handleDeleteRoom(io, redisClient, roomId);
                    }
                } catch (error) {}
            }
            })
        }, 3000);
    });

    socket.on('outFastRoom', async () => {
        const fastRooms = await redisClient.sMembers('fastRooms');
        console.log(fastRooms);
        let roomData;
        let roomId;
        let player1;
        fastRooms.forEach(async (TemproomId) => {
            roomData = await redisClient.hGetAll(TemproomId);
            console.log(roomData);
            if (roomData.player1 == userId) {
                roomId = TemproomId;
                player1 = roomData.player1;
                if (player1 === String(userId)) {
                    await handleDeleteRoom(io, redisClient, roomId);
                    socket.emit('outRoom');
                    return;
                }
            }
        });
    });

    socket.on('fastGame', () => {
        console.log(`${userId}: 큐 잡는 중...`)
        fastRoomGenerate();
    });


    socket.on('createRoom', handleCreateRoom);
    socket.on('getRoomList', getRoomList);

    socket.on('joinRoom', joinRoom);
    socket.on('getGame', getGame);
    socket.on('dragApples', dragApples);

    // WebRTC 시그널링 처리
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('getOffer', data.offer);
    });
    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('getAnswer', data.answer);
    });
    socket.on('ice', (data) => {
        socket.to(data.roomId).emit('getIce', data.ice);
    });

    socket.on('playerNum', async () => {
        const num = await redisClient.sCard('waits');
        socket.emit('playerNum', num);
    });
};

const handleDeleteRoom = async (io, redisClient, roomId) => {
    // 방 정보 불러오기
    const roomData = await redisClient.hGetAll(roomId);

    const user1 = roomData.player1;
    const user2 = roomData.player1;
    await redisClient.sRem('waits', String(user1));
    await redisClient.sRem('waits', String(user2));
    await redisClient.del(`user-${user1}-room`);
    await redisClient.del(`user-${user2}-room`);

    // 방 목록 및 유저 목록에서 제거
    await redisClient.sRem('rooms:playing', roomId);
    await redisClient.sRem('rooms:waiting', roomId);
    await redisClient.sRem('fastRooms', roomId);
    await redisClient.del(roomId);
    const normalizedTitle = roomData.title.toLowerCase().replace(/\s/g, '');
    await redisClient.zRem('rooms:title:index', `${normalizedTitle}:${roomId}`);

    delete gameStates[roomId];

    io.to('lobby').emit('deleteRoom', roomId);

    console.log(`Room ${roomId} is deleted.`)
};


module.exports = {
    registerRoomsHandlers,
    handleDeleteRoom
}