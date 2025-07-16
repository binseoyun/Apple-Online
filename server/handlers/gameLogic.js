const crypto = require('crypto');
const seedrandom = require('seedrandom');
const readline = require('readline');

function createMap() {
    const seed = crypto.randomBytes(16).toString('hex');
    const rng = seedrandom(seed);

    const mapData = [];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        const newRow = []
        for (let j = 0; j < 17; j++) {
            const randomValue = Math.floor(rng() * 9) + 1;
            sum = sum + randomValue;
            newRow.push(randomValue);
        }
        mapData.push(newRow);
    }

    const temp = mapData[9][16];
    sum = sum - temp;
    mapData[9][16] = 10 - (sum % 10);
    
    return mapData;
}

function dragApple(x1, y1, x2, y2, mapData) {
    const apple_size = 1;
    const apple_list = [];

    const x_start = Math.max(0, Math.trunc(Math.min(x1, x2) / apple_size));
    const x_end = Math.min(16, Math.trunc(Math.max(x1, x2) / apple_size));
    const y_start = Math.max(0, Math.trunc(Math.min(y1, y2) / apple_size));
    const y_end = Math.min(9, Math.trunc(Math.max(y1, y2) / apple_size));

    const cnt = (x_end - x_start + 1) * (y_end - y_start + 1);

    if (cnt >= 10) {
        return apple_list;
    }

    if ((x_start <= x_end) && (y_start <= y_end)) {
        for (let i = y_start; i <= y_end; i++) {
            for (let j = x_start; j <= x_end; j++) {
                apple_list.push([i, j]);
            }
        }
    }

    return apple_list;
}

function calculateScore(apple_list, mapData) {
    if (apple_list.length == 0) return 0;

    let sum = 0;
    let cnt = 0;
    let debug = '';
    for (const apple of apple_list) {
        debug = debug + String(mapData[apple[0]][apple[1]]);
        if (Number(mapData[apple[0]][apple[1]]) != 0) {
            sum += Number(mapData[apple[0]][apple[1]]);
            cnt += 1;
        }
        if (sum > 10) return 0;
    }
    console.log(debug);

    if (sum == 10) return cnt;
    else return 0;
}

module.exports = {
    createMap,
    dragApple,
    calculateScore,
};