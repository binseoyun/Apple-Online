const gameLogic = require('./gameLogic');

// 현재 맵에서 합이 10인 모든 유효한 사각형 후보를 탐색
function findAllValidMoves(mapData) {
    const moves = [];
    for (let r1 = 0; r1 < 10; r1++) {
        for (let c1 = 0; c1 < 17; c1++) {
            for (let r2 = r1; r2 < 10; r2++) {
                for (let c2 = c1; c2 < 17; c2++) {
                    // dragApple은 (x1, y1, x2, y2) = (col, row, col, row) 순서
                    const apples = gameLogic.dragApple(c1, r1, c2, r2, mapData);
                    const score = gameLogic.calculateScore(apples, mapData);
                    if (score > 0) {
                        moves.push({ r1, c1, r2, c2, score });
                    }
                }
            }
        }
    }
    return moves;
}

// 난이도별 행동 딜레이 (ms)
const DIFFICULTY = {
    easy:   { min: 4000, max: 7000 },
    normal: { min: 2000, max: 4000 },
    hard:   { min: 600,  max: 1800 },
};

function randomDelay(difficulty) {
    const { min, max } = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 봇 루프 시작
 * @param {object} io
 * @param {object} redisClient
 * @param {object} gameStates - 서버 gameStates 객체 (참조 공유)
 * @param {string} roomId
 * @param {string} difficulty - 'easy' | 'normal' | 'hard'
 */
function startBotLoop(io, redisClient, gameStates, roomId, difficulty) {
    const BOT_ID = 'BOT';

    async function botTick() {
        if (!gameStates[roomId]) return; // 게임 종료 시 중단

        try {
            const mapDataLoad = await redisClient.hGetAll(`game:map:${roomId}`);
            if (!mapDataLoad || Object.keys(mapDataLoad).length === 0) {
                if (gameStates[roomId]) setTimeout(botTick, randomDelay(difficulty));
                return;
            }

            // Redis 맵 → 2D 배열 변환
            const mapData = [];
            for (let i = 0; i < 10; i++) {
                const row = [];
                for (let j = 0; j < 17; j++) {
                    row.push(mapDataLoad[`${i}-${j}`]);
                }
                mapData.push(row);
            }

            const moves = findAllValidMoves(mapData);
            if (moves.length === 0) {
                if (gameStates[roomId]) setTimeout(botTick, randomDelay(difficulty));
                return;
            }

            // hard: 가장 많은 사과를 제거하는 수 선택, 나머지: 랜덤
            let chosen;
            if (difficulty === 'hard') {
                moves.sort((a, b) => b.score - a.score);
                chosen = moves[0];
            } else {
                chosen = moves[Math.floor(Math.random() * moves.length)];
            }

            const { r1, c1, r2, c2 } = chosen;

            // Redis 맵에서 사과 제거
            const pipeline = redisClient.multi();
            for (let c = c1; c <= c2; c++) {
                for (let r = r1; r <= r2; r++) {
                    pipeline.hSet(`game:map:${roomId}`, `${r}-${c}`, '0');
                }
            }
            await pipeline.exec();

            // 점수 갱신
            if (gameStates[roomId]) {
                gameStates[roomId].score2 += chosen.score;
            }

            // 클라이언트에 점수/사과 제거 이벤트 전송
            io.to(roomId).emit('getScore', {
                score: chosen.score,
                userId: BOT_ID,
                num: 2,
            });
            io.to(roomId).emit('deleteApple', {
                row1: c1, col1: r1,
                row2: c2, col2: r2,
                userId: BOT_ID,
            });

        } catch (err) {
            console.error(`[Bot] 오류 발생 (${roomId}):`, err);
        }

        if (gameStates[roomId]) {
            setTimeout(botTick, randomDelay(difficulty));
        }
    }

    // 카운트다운(3초) + 여유 시간 후 첫 동작
    setTimeout(botTick, 3500 + randomDelay(difficulty));
}

module.exports = { startBotLoop };
