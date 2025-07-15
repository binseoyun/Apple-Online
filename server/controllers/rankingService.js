const { pool } = require('../../config/db');

async function updateAllUserRankings() {
    console.log('🥇 전체 유저 랭킹 업데이트를 시작합니다...');

    // 이 쿼리가 모든 작업을 한 번에 처리합니다.
    const query = `
        INSERT INTO Rankings (user_id, ranking, elo_rating)
        SELECT 
            id, 
            -- ELO 점수가 높은 순서대로 순위를 매깁니다.
            -- 동점일 경우 같은 순위를 부여합니다. (예: 1, 2, 2, 4)
            RANK() OVER (ORDER BY elo_rating DESC) as ranking, 
            elo_rating
        FROM 
            Users
        -- user_id가 이미 Rankings 테이블에 존재하면(중복 키), 새 데이터로 덮어씁니다.
        ON DUPLICATE KEY UPDATE
            ranking = VALUES(ranking),
            elo_rating = VALUES(elo_rating);
    `;

    try {
        // DB에 쿼리 실행
        const [result] = await pool.query(query);
        
        // تأثرت الصفوف (affectedRows)가 0보다 크면 변경사항이 있었음을 의미합니다.
        console.log(`✅ 랭킹 업데이트 완료! 총 ${result.affectedRows}개의 랭킹 정보가 변경되었습니다.`);
    } catch (error) {
        console.error('❌ 랭킹 업데이트 중 심각한 에러가 발생했습니다:', error);
        // 에러를 다시 던져서 호출한 쪽에서 처리할 수 있도록 합니다.
        throw error;
    }
}

// 다른 파일에서 이 함수를 사용할 수 있도록 export 합니다.
module.exports = { updateAllUserRankings };