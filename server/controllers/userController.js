const passport = require('passport');
const { pool } = require('../../config/db');

async function getUserNickname(userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'SELECT nickname FROM Users WHERE id = ?';
        const [row] = await connection.execute(sql, [userId]);
        if (row.length > 0) {
            return row[0].nickname;
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function getProfile(userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'SELECT id, nickname, elo_rating, profile_image_url FROM Users WHERE id = ?';
        const [row] = await connection.execute(sql, [userId]);
        if (row.length > 0) {
            return row[0];
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function getRanking(userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'SELECT ranking FROM Rankings WHERE user_id = ?';
        const [row] = await connection.execute(sql, [userId]);
        if (row.length > 0) {
            return row[0];
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}


async function updateUserNickname(userId, newUsername) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'UPDATE Users SET nickname = ? WHERE id = ?';
        const [row] = await connection.execute(sql, [newUsername, userId]);
        if (row.length > 0) {
            return row[0];
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`, error);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function updateUserElo(userId, newElo) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'UPDATE Users SET elo_rating = ? WHERE id = ?';
        const [row] = await connection.execute(sql, [newElo, userId]);
        if (row.length > 0) {
            return row[0];
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`, error);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}


async function updateUserImageUrl(userId, newImageUrl) {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = 'UPDATE Users SET profile_image_url = ? WHERE id = ?';
        const [row] = await connection.execute(sql, [newImageUrl, userId]);
        if (row.length > 0) {
            return row[0];
        } else {
            return null;
        }
    } catch (error) {
        console.log(`${userId}의 조회에 실패하였습니다.`);
        return null;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

function calculateElo(user1_rating, user2_rating, winner, kFactor = 32) {
    const winning_p_user1 = 1 / (1 + Math.pow(10, (user2_rating - user1_rating) / 400));
    const winning_p_user2 = 1 - winning_p_user1;
    
    let scoreA = 0;
    let scoreB = 0;
    if (winner == 0) {
        scoreA = 0.5;
        scoreB = 0.5;
    } else if (winner == 1) {
        console.log("player1의 승리! rating 상승!")
        scoreA = 1;
        scoreB = 0;
    } else {
        scoreA = 0;
        scoreB = 1;
    }

    const new_user1_rating = user1_rating + kFactor * (scoreA - winning_p_user1);
    const new_user2_rating = user2_rating + kFactor * (scoreB - winning_p_user2);

    return {
        newRatingA: Math.round(new_user1_rating),
        newRatingB: Math.round(new_user2_rating)
    };
}


module.exports = {
    // 구글 로그인 시작
    googleLogin: passport.authenticate('google', {
        scope: ['profile', 'email']
    }),

    googleCallback: passport.authenticate('google', {
        failureRedirect: '/login.html', // 로그인 실패 시 리디렉션될 경로
        successRedirect: '/lobby.html' // 로그인 성공 시 리디렉션될 경로
    }),

    // 로그아웃
    logout: (req, res, next) => {
        req.logout((err) => {
            if (err) { return next(err); }
            res.redirect('/');
        });
    },
    getUserNickname,
    getProfile,
    updateUserImageUrl,
    updateUserNickname,
    calculateElo,
    updateUserElo,
    getRanking
}