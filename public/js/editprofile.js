const imageInput = document.getElementById('imageInput');
const previewDiv = document.getElementById('preview');
const usernameInput = document.getElementById('username');

document.addEventListener('DOMContentLoaded', async () => {
  const saveButton = document.getElementById('save-button');

  async function loadCurrentProfile() {
    try {
        const response = await fetch('/api/profile/get');
        if (!response.ok) throw new Error('Failed to load profile');
        if (response.ok) {
            const data = await response.json();
            usernameInput.value = data.nickname;
            previewDiv.style.backgroundImage = `url('${data.profile_image_url}')`;
        }

        // 👇 데이터 로딩 성공 시 버튼 활성화!
        saveButton.disabled = false;
        saveButton.classList.remove('bg-gray-400'); // 회색 배경 제거
        saveButton.classList.add('bg-[#181811]');   // 원래 배경색 추가

    } catch (error) {
        console.error('Error loading profile:', error);
        // 에러 발생 시 버튼을 계속 비활성화 상태로 두거나, 에러 메시지를 표시합니다.
    }
  }

  loadCurrentProfile();
});

imageInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.style.backgroundImage = `url('${e.target.result}')`;
    };
    reader.readAsDataURL(file);
  }
});

async function goBack() {
  // FormData 객체를 만들어 폼 데이터를 담을 준비를 합니다.
  const formData = new FormData();

  // 입력된 닉네임 값을 formData에 추가합니다.
  formData.append('username', usernameInput.value);

  // 새 이미지 파일이 선택되었는지 확인하고, 선택되었다면 formData에 추가합니다.
  if (imageInput.files.length > 0) {
      formData.append('profileImage', imageInput.files[0]);
  }

  try {
      // 서버의 업데이트 API로 formData를 POST 방식으로 전송합니다.
      const response = await fetch('https://applegame.shop/api/profile/update', {
          method: 'POST',
          body: formData
      });

      if (!response.ok) {
          // 서버 응답이 실패하면 에러를 발생시킵니다.
          throw new Error('프로필 저장에 실패했습니다.');
      }

      // 성공적으로 저장되었을 경우
      alert('프로필이 성공적으로 저장되었습니다.');
      window.location.href = 'profile.html'; // 프로필 조회 페이지로 이동

  } catch (error) {
    console.log(error);
    console.error('Error saving profile:', error);
    alert(error.message);
  }
}