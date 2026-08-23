# 꿀주차 (Kkul-Parking)

목적지 주변의 **무료 / 조건부 무료 / 공영 주차장**을 지도에서 한눈에 찾아주는 모바일 우선 웹앱입니다. 카카오맵·공유누리·공공데이터포털·OpenStreetMap 데이터를 통합해서 보여주고, 예상 주차 요금과 절약 금액까지 계산해줍니다.

- **서비스 URL:** https://app-kkulparking-prod-vjsa7o.azurewebsites.net
- **저장소:** https://github.com/baekjungi/Kkul-Parking

## 서비스 소개

- 🗺️ **통합 지도 검색** — 카카오맵 JS SDK를 기본으로 쓰고, 실패 시 Leaflet(OSM) 지도로 자동 전환
- 🅿️ **다중 데이터 소스** — 카카오 장소검색, 공유누리, 공공데이터포털(공항/포천/충주/광양/대전), 로컬 시드 데이터를 하나의 지도에 통합 표시
- 💰 **절약 금액 계산** — 목적지 주변 평균 요금 대비 얼마나 절약되는지 자동 계산해서 보여줌
- 📍 **실시간 위치 추적 + 나침반 모드** — 내 위치 버튼 한 번은 위치 조회, 두 번은 나침반(헤딩업 지도 회전) 모드로 전환
- 🔗 **카카오톡 공유 / 길찾기** — 선택한 주차장을 카카오톡으로 바로 공유하거나 카카오톡 길찾기로 연결
- 📝 **주차 꿀팁 제보** — 사용자가 발견한 무료/조건부 주차 정보를 제보하고 검수 후 반영
- 🔒 **보안 강화** — XSS 방지, CORS 운영 정책, CSP(Report-Only), Rate Limit, Key Vault 기반 비밀키 관리

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

## 2) 현재 구현 상태

### 구현 완료
- 지도 기반 메인 UI (모바일 우선, 카카오맵 + Leaflet 폴백)
- 검색창 + 위치 이동 + 타입/레이어 필터
- 주차장 마커 표시 (무료/조건부/공영/건물/주변시설)
- 바텀시트 상세 카드 + 절약 정보
- 실시간 위치 추적(watchPosition) + 나침반 헤딩업 지도 회전
- 카카오톡 공유(Kakao Share SDK) / 카카오톡 길찾기 연동
- 제보 등록 폼 + API 연동
- Express API 서버 (검색/상세/제보/통합검색)
- Azure App Service 배포 + GitHub Actions 자동배포(CI/CD)

### MVP 범위 외 (추후)
- 실제 로그인/회원
- 실제 이미지 업로드 스토리지
- 저장됨/설정 탭 실기능
- 제보 데이터의 DB 영속화 (현재는 파일 기반 JSON)

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
├─ infra/                  # Azure Bicep 인프라
│  ├─ main.bicep
│  └─ modules/resources.bicep
├─ .github/workflows/      # GitHub Actions CI/CD
│  └─ azure-deploy.yml
├─ server.js
├─ azure.yaml
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
- ALLOWED_ORIGINS는 실제 서비스 도메인만 입력 (미설정 시 production에서는 브라우저 교차 출처 요청을 기본 차단)
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX=120~300
- REPORT_RATE_LIMIT_MAX=10~30

## 6) 카카오 연동 주의사항

카카오 키는 반드시 용도를 분리해서 사용하세요.

- KAKAO_JAVASCRIPT_KEY: 브라우저 SDK 로딩용 키
- KAKAO_REST_API_KEY: 서버에서 카카오 REST 호출할 때만 사용 (클라이언트 노출 금지)

필수 체크:

- 카카오 개발자 콘솔에서 플랫폼(웹) 도메인 등록 (배포 도메인 포함)
- JavaScript 키는 허용된 도메인에서만 동작
- 운영 환경에서 .env 실제 키는 Git에 커밋하지 않기 (Azure 배포 시 Key Vault 시크릿으로 관리)
- 카카오 데이터는 외부 데이터이므로 요금/운영시간은 현장 확인 안내 필요

현재 버전은 Leaflet 지도를 폴백으로 유지하면서 카카오맵을 기본으로 사용합니다.
검색 우선순위는 서버 REST 프록시 -> 카카오 JS SDK -> OSM Nominatim fallback 입니다.
지도 상단 레이어에서 주차장 / 건물 / 주변시설 데이터를 전환해서 볼 수 있습니다.
추가로 공유누리/공공데이터포털 주차 데이터를 API로 가져와 지도에서 분리 조회 또는 통합 조회할 수 있습니다.

## 7) 배포

### Azure App Service + GitHub Actions (현재 운영 방식)
- 인프라: `infra/main.bicep` (App Service Linux Node 20, Key Vault, Log Analytics, App Insights)
- CI/CD: `main` 브랜치 push 시 `.github/workflows/azure-deploy.yml`이 자동으로 Azure App Service에 배포
- 인증: GitHub OIDC(Federated Credential) 기반, 저장소에 Azure 비밀번호/시크릿 저장하지 않음
- 배포 후 `/api/health` 자동 헬스체크

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

## 8) 최근 업데이트

- **2026-08-23**
  - Azure App Service(Linux, Node 20)에 배포, Bicep으로 Key Vault/Log Analytics/App Insights 구성
  - GitHub Actions 기반 CI/CD 파이프라인 구축 (OIDC 인증, 시크릿 저장 없음)
  - 서버 보안 점검: XSS(이스케이프 누락) 수정, CORS 운영 정책 강화, CSP Report-Only 적용, Docker non-root 실행
  - 나침반 모드에서 지도가 실제로 회전하는 헤딩업 내비게이션 기능 추가 (북쪽 인디케이터 포함)
  - 내 위치 버튼 3단계 모드(위치조회 → 나침반 → 위치조회) + 실시간 위치 추적(watchPosition) 적용
  - 카카오톡 공유를 정식 Kakao Share SDK로 교체, 카카오톡 길찾기 연동 추가
  - 위치/나침반 아이콘을 이모지에서 커스텀 SVG로 교체
  - 지도 렌더링 실패 원인(CSS position 누락, 변수 선언 오류) 수정
  - UI 전반 접근성/터치 타겟/여백 개선 및 프로모션 배너 제거
