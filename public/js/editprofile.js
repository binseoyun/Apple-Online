 const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');

  
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

    function goBack() {
      //여기서 저장 로직을 구현해야 하는 데 이름과 사진 모두 변경되게 구현
      //저장된 후 다시 profile.html로 이동
   
      window.location.href = "profile.html"; // 예: profile.html
    }