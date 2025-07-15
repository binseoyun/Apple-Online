document.addEventListener('DOMContentLoaded', () => {
    
    // 프로필 정보를 불러와서 화면에 그리는 함수
    async function loadUserProfile() {
        try {
            // 1. 서버에 프로필 정보를 요청합니다.
            const response = await fetch('/api/profile/get');
            const ranking = await fetch('/api/profile/get/ranking');
            if (!response.ok) {
                throw new Error('프로필 정보를 불러오는 데 실패했습니다.');
            }
            const data = await response.json();
            const rank = await ranking.json();

            // 2. ID를 이용해 HTML 요소들을 선택합니다.
            const imageDiv = document.getElementById('profile-image');
            const nameElement = document.getElementById('profile-name');
            const userIdElement = document.getElementById('profile-userid');
            const rankingElement = document.getElementById('profile-ranking');

            // 3. 받아온 데이터로 각 요소의 내용을 업데이트합니다.
            imageDiv.style.backgroundImage = `url('${data.profile_image_url}')`;
            nameElement.textContent = data.nickname;
            userIdElement.textContent = `User ID: ${data.id}`;
            rankingElement.textContent = `Rating: ${data.elo_rating}(${rank.ranking}위)`;

        } catch (error) {
            console.error(error);
            // 에러 발생 시 사용자에게 알려줄 수도 있습니다.
            document.querySelector('.layout-content-container').innerHTML = '<p>프로필 정보를 불러올 수 없습니다.</p>';
        }
    }

    async function fetchGameHistory() {
        try {
            // 1단계에서 만든 API 엔드포인트로 GET 요청
            const response = await fetch('/api/users/me/history');
            
            if (!response.ok) {
                throw new Error('전적 데이터를 가져오는데 실패했습니다.');
            }
    
            const data = await response.json();
            // 3단계에서 만들 함수를 호출하여 화면에 데이터를 표시
            displayGameHistory(data);
    
        } catch (error) {
            console.error(error);
            // 에러 발생 시 사용자에게 알려줄 수 있습니다.
            const historyContainer = document.getElementById('game-history-container');
            historyContainer.innerHTML = '<p class="text-center text-red-500">전적을 불러올 수 없습니다.</p>';
        }
    }

    function displayGameHistory(data) {
        const { currentUserId, history } = data;
        const container = document.getElementById('game-history-container');
        
        // 이전에 있던 내용을 비웁니다.
        container.innerHTML = ''; 
    
        if (history.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">게임 전적이 없습니다.</p>';
            return;
        }
    
        // 각 전적 데이터를 순회하며 HTML 요소를 만듭니다.
        history.forEach(record => {
            // 1. 나와 상대방 정보 결정하기
            const isPlayer1 = record.player1_id === currentUserId;
            const opponentName = isPlayer1 ? record.player2_name : record.player1_name;
            const opponentImage = isPlayer1 ? record.player2_image : record.player1_image;
            const timedata = record.gametime;

            const date = new Date(timedata);

            const year = date.getFullYear();
            // getMonth()는 0부터 시작하므로 1을 더해줍니다.
            // padStart(2, '0')는 '5'를 '05'처럼 두 자리로 만들어줍니다.
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
          
            const gametime =  `${year}-${month}-${day} ${hours}시 ${minutes}분 ${seconds}초`;
            
            // 2. 승패 및 ELO 변화 결정하기
            let resultText = '';
            let resultColor = 'text-[#101810]'; // 기본: 무승부 (검정)
            let eloChangeText = '';
    
            const oldElo = isPlayer1 ? record.player1_old_elo : record.player2_old_elo;
            const newElo = isPlayer1 ? record.player1_new_elo : record.player2_new_elo;
            const eloDiff = newElo - oldElo;
            
            if (record.winner_id === currentUserId) {
                resultText = '승리';
                resultColor = 'text-blue-600'; // 승리 (파랑)
                eloChangeText = `(Elo ${oldElo} → ${newElo}, <span class="text-green-500 font-bold">+${eloDiff}</span>)`;
            } else if (record.winner_id === null) {
                resultText = '무승부';
                eloChangeText = `(Elo ${oldElo} → ${newElo}, <span class="font-bold">${eloDiff}</span>)`;
            } else {
                resultText = '패배';
                resultColor = 'text-red-600'; // 패배 (빨강)
                eloChangeText = `(Elo ${oldElo} → ${newElo}, <span class="text-red-500 font-bold">${eloDiff}</span>)`;
            }
    
            // 3. 화면에 추가할 HTML 템플릿 만들기
            const recordHtml = `
                <div class="flex items-center gap-4 bg-[#f9fbf9] px-4 min-h-[72px] py-2 rounded-lg">
                    <div
                        class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 flex-shrink-0"
                        style="background-image: url('${opponentImage || 'default-profile.png'}');"
                    ></div>
                    <div class="flex flex-col justify-center">
                        <p class="text-base font-medium leading-normal">
                            <span class="${resultColor} font-bold">${resultText}</span>
                            <span class="text-gray-500 text-sm">${eloChangeText}</span>
                        </p>
                        <p class="text-[#5c8a5c] text-sm font-normal leading-normal">
                            ${gametime} / 상대: ${opponentName}
                        </p>
                    </div>
                </div>
            `;
            
            // 4. 컨테이너에 생성된 HTML 추가
            container.innerHTML += recordHtml;
        });
    }

    // 페이지가 로드되면 프로필 정보 불러오기 함수를 실행합니다.
    loadUserProfile();
    fetchGameHistory();
});