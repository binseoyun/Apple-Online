document.addEventListener('DOMContentLoaded', () => {
    
    // 프로필 정보를 불러와서 화면에 그리는 함수
    async function loadUserProfile() {
        try {
            // 1. 서버에 프로필 정보를 요청합니다.
            const response = await fetch('/api/profile/get');
            if (!response.ok) {
                throw new Error('프로필 정보를 불러오는 데 실패했습니다.');
            }
            const data = await response.json();

            // 2. ID를 이용해 HTML 요소들을 선택합니다.
            const imageDiv = document.getElementById('profile-image');
            const nameElement = document.getElementById('profile-name');
            const userIdElement = document.getElementById('profile-userid');
            const rankingElement = document.getElementById('profile-ranking');

            // 3. 받아온 데이터로 각 요소의 내용을 업데이트합니다.
            imageDiv.style.backgroundImage = `url('${data.profile_image_url}')`;
            nameElement.textContent = data.nickname;
            userIdElement.textContent = `User ID: ${data.id}`;
            rankingElement.textContent = `Ranking: ${data.elo_rating}`;

        } catch (error) {
            console.error(error);
            // 에러 발생 시 사용자에게 알려줄 수도 있습니다.
            document.querySelector('.layout-content-container').innerHTML = '<p>프로필 정보를 불러올 수 없습니다.</p>';
        }
    }

    // 페이지가 로드되면 프로필 정보 불러오기 함수를 실행합니다.
    loadUserProfile();
});