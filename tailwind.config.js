/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/html/**/*.html",    // HTML 파일 경로에 맞게 수정
    "./src/**/*.{js,ts}"          // JS/TS 파일이 있다면 포함
  ],
  theme: {
    extend: {
      colors: {
        apple: "#fcfcf8",
        lemon: "#eeee06"
      },
      fontFamily: {
        sans: ['"Spline Sans"', '"Noto Sans"', "sans-serif"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
