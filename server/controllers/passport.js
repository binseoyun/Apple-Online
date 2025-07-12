const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../../config/db');

module.exports = (passport) => {
    // 구글 로그인 설정
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'auth/google/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const sql = 'SELECT * FROM Users WHERE google_id = ?';
                const [rows] = await pool.query(sql, [profile.id]);

                if (rows.length > 0) {
                    return done(null, rows[0]) // 기존 유저 처리
                } else {
                    // 새로운 유저 DB에 추가
                    const newUser = {
                        google_id: profile.id,
                        nickname: profile.displayName,
                        profile_image_url: profile.photos[0].value
                    };
                    const insertSql = 'INSERT INTO Users (google_id, nickname, profile_image_url) VALUES (?, ?, ?)';
                    const [result] = await pool.query(insertSql, [newUser.google_id, newUser.nickname, newUser.profile_image_url]);
                    const [newRows] = await pool.query('SELECT * FROM Users WHERE id = ?', [result.insertId]);
                    return done(null, newRows[0]);
                }
            } catch (error) {
                return done(error);
            }
        }
    ));
    
    // 사용자 정보를 세션에 전달(로그인)
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // 세션에서 사용자 정보 불러오기
    passport.deserializeUser(async (id, done) => {
        try {
            const [rows] = await pool.query('SELECT * FROM Users WHERE id = ?', [id]);
            done(null, row[0]);
        } catch (error) {
            done(error);
        }
    });
};