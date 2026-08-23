# Kkul-Parking

꿀주차 MVP 웹앱입니다. 목적지 주변의 무료/조건부 무료/공영 주차장을 지도에서 찾고, 상세 절약 정보를 확인하고, 꿀팁 제보를 등록할 수 있습니다.

## 1) 실행 방법

### 요구사항
- Node.js 18 이상

### 설치
```bash
npm install
```

### 개발 실행
```bash
npm run dev
```

### 일반 실행
```bash
npm start
```

### 배포 전 점검
```bash
npm run preflight
```

### 운영 실행
```bash
npm run start:prod
```

실행 후 아래 주소로 접속:
- http://localhost:3000

## 2) 현재 구현 상태 (배포 전)

### 구현 완료
- 지도 기반 메인 UI (모바일 우선)
- 검색창 + 위치 이동 + 타입 필터
- 주차장 마커 표시 (무료/조건부/공영)
- 바텀시트 상세 카드 + 절약 정보
- 제보 등록 폼 + API 연동
- Express API 서버 (검색/상세/제보)

### MVP 범위 외 (추후)
- 실제 로그인/회원
- 실제 이미지 업로드 스토리지
- 저장됨/설정 탭 실기능

## 3) 폴더 구조
```text
.
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ data/
│  ├─ parking-spots.json
│  └─ reports.json
├─ server.js
├─ .env.example
├─ prd.md
└─ DEPLOY_PREP.md
```

## 4) 주요 API
- GET /api/parking/search
- GET /api/parking/:id
- POST /api/reports
- GET /api/health
- GET /api/config/client
- GET /api/parking/unified-search
- GET /api/kakao/places/search
- GET /api/kakao/places/categories
- GET /api/gongyu/parking
- GET /api/data-go/parking

상세 스펙은 prd.md의 API 섹션 참고.

## 5) 환경변수
.env.example 기준:
- PORT=3000
- DESTINATION_HOURLY_FEE=7500
- NODE_ENV=development
- ALLOWED_ORIGINS=
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX=180
- REPORT_RATE_LIMIT_MAX=20
- KAKAO_JAVASCRIPT_KEY=
- KAKAO_REST_API_KEY=

운영 권장값:
- NODE_ENV=production
- ALLOWED_ORIGINS는 실제 서비스 도메인만 입력
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX=120~300
- REPORT_RATE_LIMIT_MAX=10~30

## 6) 카카오 연동 주의사항

카카오 키는 반드시 용도를 분리해서 사용하세요.

- KAKAO_JAVASCRIPT_KEY: 브라우저 SDK 로딩용 키
- KAKAO_REST_API_KEY: 서버에서 카카오 REST 호출할 때만 사용 (클라이언트 노출 금지)

필수 체크:

- 카카오 개발자 콘솔에서 플랫폼(웹) 도메인 등록
- JavaScript 키는 허용된 도메인에서만 동작
- 운영 환경에서 .env 실제 키는 Git에 커밋하지 않기
- 카카오 데이터는 외부 데이터이므로 요금/운영시간은 현장 확인 안내 필요

현재 버전은 Leaflet 지도를 유지하면서 카카오 장소 검색 결과를 보강해 표시합니다.
검색 우선순위는 서버 REST 프록시 -> 카카오 JS SDK -> OSM Nominatim fallback 입니다.
지도 상단 레이어에서 주차장 / 건물 / 주변시설 데이터를 전환해서 볼 수 있습니다.
추가로 공유누리/공공데이터포털 주차 데이터를 API로 가져와 지도에서 분리 조회 또는 통합 조회할 수 있습니다.

## 7) 배포 옵션

### PM2 배포
```bash
npm i -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### Docker 배포
```bash
docker build -t kkul-parking:latest .
docker run -d -p 3000:3000 --env-file .env --name kkul-parking kkul-parking:latest
```
