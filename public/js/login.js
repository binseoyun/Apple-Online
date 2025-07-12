 //Firebase 초기화 코드가 필요
        // Firebase 설정 정보

  /*로그인이 되는 전체 과정
  1.사용자 입장(로그인 버튼 클릭)
로그인 버튼 클릭시 js에서 Google OAuth 요청이 발생
 2. 클라이언트:Google로그인 팝업 창 열림 => Google의 OQuth 서버로 요청
 3.Google: 인증 후 access token을 클라이언트로 전달
 4.token을 사용해서 사용자 프로필 요청, singInWithPopup 메서드 사용해서 내부 처리
 5.로그인 완료 후 객체 정보 가지고 옴
 

  */
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