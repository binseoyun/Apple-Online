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
    updateUserNickname
}