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

//HTML 문서가 모두 로드되고 나서 버튼을 제대로 찾을 수 있게 
 document.addEventListener("DOMContentLoaded",()=>{
 //1.Firebase 설정 정보
   const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID",
  };
 
  // Firebase 초기화
  firebase.initializeApp(firebaseConfig);

  //3.Firebase Authentication 인스턴스 가져오기
  const auth = firebase.auth();

  //4.Google 로그인 제공자 생성(내부 함수 사용해서 자체 처리)
  const provider = new firebase.auth.GoogleAuthProvider();

  //5.로그인 이벤트 처리
  //login-button 클릭시 google 창 열림
const loginBtn=document.getElementById("loginbtn"); //login.html에서 loginbtn을 가져와서 

  if(!loginBtn){
    console.error("loginBtn요소 없음");
    return;
  }
  

  loginBtn.addEventListener("click", () => {
    auth.signInWithPopup(provider) //팝업 창 열림(Firebase가 해당 계정 정보 받아옴)
      .then((result) => {
        const user=result.user; //사용자 정보 가져와서
        if(user){ 
          window.location.href="lobby.html"; //사용자 정보 존재 시 lobby.html로
        }
        alert("사용자 정보가 없습니다: "+error.message);
        window.location.href="login.html"; 
      })
      .catch((error) => {
        console.error("Login failed:", error.message);
        alert("로그인에 실패했습니다: " + error.message);
        window.location.href="login.html"; //다시 원래 로그인 화면을 복귀
      });


  });
});

/*
문제
1.DOM이 완전히 로드되기 전에 JS가 실행=>login-button을 찾지 못함
2.Firebase SDK를 <script>로 로드하지 않음


  // 로그인 함수(현재는 loginWithGoogle 함수를 이용해서 Google 로그인을 연결하고 있음)
  function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user; //사용자 정보 가져와서
        console.log("Logged in as:", user.displayName);
        // 로그인 성공 후 페이지 이동
        window.location.href = "lobby.html";
      })
      .catch((error) => {
        console.error("Login failed:", error.message);
        alert("로그인에 실패했습니다: " + error.message);
      });
      
  */