 //Firebase 초기화 코드가 필요
        // Firebase 설정 정보
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID",
  };

  // Firebase 초기화
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  // 로그인 함수
  function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        console.log("Logged in as:", user.displayName);
        // 로그인 성공 후 페이지 이동
        window.location.href = "lobby.html";
      })
      .catch((error) => {
        console.error("Login failed:", error.message);
        alert("로그인에 실패했습니다: " + error.message);
      });
  }