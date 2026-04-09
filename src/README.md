# src/

Tailwind CSS 빌드 소스 디렉토리입니다.  
실제 게임 화면에는 사용되지 않으며, **CSS 빌드 파이프라인의 입력 소스** 역할만 합니다.

## 파일 구성

| 파일 | 역할 |
|------|------|
| `input.css` | Tailwind의 `@tailwind base/components/utilities` 지시어 포함 — 빌드 입력 파일 |
| `style.css` | 추가 글로벌 스타일 |
| `App.jsx` | 초기 React 셋업 흔적 (현재 미사용, 프로젝트는 Vanilla JS 기반) |
| `main.jsx` | 초기 React 셋업 흔적 (현재 미사용) |

## 빌드 방법

```bash
npm run build
# tailwindcss -i ./src/input.css -o ./dist/output.css --minify
```

빌드 결과물은 `dist/output.css`에 생성됩니다.

## Tailwind 설정 (`tailwind.config.js`)

| 항목 | 값 |
|------|-----|
| content 스캔 대상 | `public/html/**/*.html`, `src/**/*.{js,ts}` |
| 커스텀 색상 | `apple: #fcfcf8`, `lemon: #eeee06` |
| 커스텀 폰트 | `Spline Sans`, `Noto Sans` |
| 플러그인 | `@tailwindcss/forms`, `@tailwindcss/container-queries` |

> `public/html/` 의 HTML 파일에서 Tailwind 클래스를 직접 사용하며,  
> 각 화면별 추가 스타일은 `public/css/` 의 개별 CSS 파일로 관리합니다.
