document.addEventListener('DOMContentLoaded', () => {

  async function fetchGameHistory() {
    try {
        // 1단계에서 만든 API 엔드포인트로 GET 요청
        const response = await fetch('/api/ranking/get');
        
        if (!response.ok) {
            throw new Error('랭킹 데이터를 가져오는데 실패했습니다.');
        }

        const data = await response.json();
        // 3단계에서 만들 함수를 호출하여 화면에 데이터를 표시
        displayRankingTop3(data);

    } catch (error) {
        console.error(error);
        // 에러 발생 시 사용자에게 알려줄 수 있습니다.
        const historyContainer = document.getElementById('top-players');
        historyContainer.innerHTML = '<p class="text-center text-red-500">랭킹을 불러올 수 없습니다.</p>';
    }
  }

  function displayRankingTop3(data) {
    const { currentUserId, ranking } = data;

    //순위에 따라 트로피 이모지 매핑
    const rankEmojis = ["🥇", "🥈", "🥉"];

    const container = document.getElementById("top-players");

    container.innerHTML = ''; 


    //topPlayers에서 player와 해당 index를 각각 가지고 옴
    let index = 1;
    ranking.forEach(player => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "flex items-center gap-4 bg-[#f9fbf9] px-4 min-h-[72px] py-2";

      playerDiv.innerHTML = `
        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14" style="background-image: url('${player.profile_image_url}');"></div>
        <div class="flex flex-col justify-center">
          <p class="text-[#101810] text-base font-medium leading-normal whitespace-nowrap">${rankEmojis[index-1]} ${player.nickname}</p>
          <p class="text-[#5c8a5c] text-sm font-normal leading-normal">Rank ${index} (${player.elo})</p>
        </div>
      `;

      container.appendChild(playerDiv); //ranking.html의 top-players 부분인 container에 playerDiv가 추가가 됨
      index++;
    });

    if (ranking.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">플레이어가 별로 없습니다.</p>';
        return;
    }

    // 업데이트 시간 표시
    const updateTimeElement = document.getElementById('update-time');
    if (ranking.length > 0 && ranking[0].time) {
        const lastUpdateTime = new Date(ranking[0].time);
        const hours = String(lastUpdateTime.getHours()).padStart(2, '0');
        const minutes = String(lastUpdateTime.getMinutes()).padStart(2, '0');
        updateTimeElement.textContent = `랭킹은 10분마다 업데이트됩니다. (최신 업데이트: ${hours}시 ${minutes}분)`;
    }
  }

  fetchGameHistory();
});