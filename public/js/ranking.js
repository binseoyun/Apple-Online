//사용자 데이터를 배열로 준비
const topPlayers = [
    {
      name: "Sophia Clark",
      imageUrl: "https://example.com/sophia.png"
    },
    {
      name: "Ethan Miller",
      imageUrl: "https://example.com/ethan.png"
    },
    {
      name: "Ava Johnson",
      imageUrl: "https://example.com/ava.png"
    }
  ];
//순위에 따라 트로피 이모지 매핑
  const rankEmojis = ["🥇", "🥈", "🥉"];


  const container = document.getElementById("top-players");

  //topPlayers에서 player와 해당 index를 각각 가지고 옴
  topPlayers.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = "flex items-center gap-4 bg-[#f9fbf9] px-4 min-h-[72px] py-2";

    playerDiv.innerHTML = `
      <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14" style="background-image: url('${player.imageUrl}');"></div>
      <div class="flex flex-col justify-center">
        <p class="text-[#101810] text-base font-medium leading-normal whitespace-nowrap">${rankEmojis[index]} ${player.name}</p>
        <p class="text-[#5c8a5c] text-sm font-normal leading-normal">Rank ${index + 1}</p>
      </div>
    `;

    container.appendChild(playerDiv); //ranking.html의 top-players 부분의 container에 playerDiv가 추가가 됨
  });