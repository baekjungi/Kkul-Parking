# 꿀주차 (Kkul-Parking)

> 목적지 주변의 **무료 / 조건부 무료 / 공영 주차장**을 지도에서 한눈에 찾아주는 모바일 우선 웹앱

카카오맵을 중심으로 공유누리·공공데이터포털·OpenStreetMap 등 여러 공공/민간 주차 데이터를 하나의 지도에 통합하고, 예상 주차 요금과 절약 금액까지 계산해주는 개인 프로젝트입니다. 기획부터 프론트/백엔드 개발, 보안 점검, Azure 클라우드 배포, CI/CD 파이프라인 구축까지 전 과정을 직접 진행했습니다.

- 🚀 **서비스 바로가기:** https://app-kkulparking-prod-vjsa7o.azurewebsites.net
- 💻 **저장소:** https://github.com/baekjungi/Kkul-Parking

## 프로젝트 소개

"주차할 곳을 못 찾아서 목적지 근처를 뱅뱅 도는 상황"을 줄이고 싶어서 시작한 프로젝트입니다. 카카오맵 하나만으로는 알기 어려운 **무료/조건부 무료 주차장**을 여러 공공데이터 소스와 함께 지도에 모아 보여주고, 실제로 얼마를 아낄 수 있는지 계산해서 알려주는 데 초점을 맞췄습니다.

## 주요 기능

- 🗺️ **통합 지도 검색** — 카카오맵 JS SDK를 기본으로 사용하고, 로드에 실패하면 Leaflet(OSM) 지도로 자동 전환되는 이중화 구조
- 🅿️ **다중 데이터 소스 통합** — 카카오 장소검색, 공유누리, 공공데이터포털(공항/포천/충주/광양/대전), 자체 시드 데이터를 한 지도에서 통합/분리 조회
- 💰 **절약 금액 자동 계산** — 목적지 주변 평균 주차 요금 대비 얼마나 아낄 수 있는지 실시간으로 계산
- 📍 **실시간 위치 추적 + 나침반 모드** — 내 위치 버튼 한 번은 위치 조회, 두 번은 나침반(헤딩업 지도 회전) 모드로 전환되는 3단계 UX
- 🔗 **카카오톡 공유 / 길찾기 연동** — 선택한 주차장을 카카오톡으로 바로 공유하거나 카카오톡 길찾기로 연결
- � **사진 업로드 & SQLite DB 저장** — 영수증/요금표 사진 첨부(Multer) 및 제보 데이터의 SQLite(better-sqlite3) 영속화
- 🧪 **자동화 테스트 수트** — Jest & Supertest 기반 4개 테스트 수트(43개 테스트)로 요금 계산, 데이터 정규화, API 검증
- 🔒 **프로덕션 수준 보안** — XSS 방지, 운영 CORS 정책, CSP(Report-Only), Rate Limit, Key Vault 기반 비밀키 관리
- ☁️ **클라우드 네이티브 배포** — Azure App Service + Bicep IaC + GitHub Actions CI/CD로 push 한 번에 자동 배포

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Vanilla JS, Leaflet, Kakao Maps JS SDK, Kakao Share SDK |
| Backend | Node.js, Express 5, SQLite (better-sqlite3), Multer |
| 테스트 | Jest, Supertest (단위 및 API 통합 테스트) |
| 외부 연동 | 카카오 로컬/장소 API, 공유누리 API, 공공데이터포털 API, OpenStreetMap Nominatim |
| 인프라 (IaC) | Azure Bicep (App Service, Key Vault, Log Analytics, Application Insights) |
| CI/CD | GitHub Actions + Azure OIDC(Federated Credential) |
| 보안 | Helmet(CSP), Rate Limiting, RBAC(Managed Identity), Key Vault |


## 폴더 구조
```text
.
├─ public/                # 프론트엔드 (index.html / styles.css / app.js)
├─ tests/                 # Jest 단위 & API 통합 테스트 수트
├─ data/                  # 로컬 시드 데이터 (주차장, 제보 SQLite DB)
├─ infra/                 # Azure Bicep 인프라 코드
├─ .github/workflows/     # GitHub Actions CI/CD 파이프라인
├─ server.js              # Express API 서버
├─ azure.yaml             # azd 설정
├─ .env.example
├─ prd.md                 # 기획 문서
└─ DEPLOY_PREP.md         # 배포 전 점검 체크리스트
```

## 주요 API
- `GET /api/parking/search` / `GET /api/parking/:id`
- `POST /api/reports` / `GET /api/reports` / `GET /api/reports/:id`
- `POST /api/upload` — 주차장/영수증 사진 파일 업로드
- `GET /api/parking/unified-search` — 통합 검색(카카오+공유누리+공공데이터+로컬)
- `GET /api/kakao/places/search` / `GET /api/kakao/places/categories`
- `GET /api/gongyu/parking` / `GET /api/data-go/parking`
- `GET /api/health` / `GET /api/config/client`

상세 스펙은 [prd.md](prd.md) 참고.

## 배포 아키텍처

```
GitHub (main push)
   └─ GitHub Actions (OIDC 인증, npm test 실행, 시크릿 저장 없음)
        └─ Azure App Service (Linux, Node 22 LTS)
             ├─ Key Vault (카카오/공유누리 API 키)
             ├─ Log Analytics
             └─ Application Insights
```

- 인프라: `infra/main.bicep` 기반으로 프로비저닝 (App Service, Key Vault, Log Analytics, App Insights)
- CI/CD: `main` 브랜치에 push하면 `.github/workflows/azure-deploy.yml`이 자동으로 배포하고 `/api/health`로 검증
- 인증: GitHub OIDC(Federated Credential) 방식으로, 저장소에 Azure 비밀번호/시크릿을 저장하지 않음
- 다른 환경(PM2, Docker)으로도 배포 가능 — 자세한 내용은 [DEPLOY_PREP.md](DEPLOY_PREP.md) 참고

## 환경변수

`.env.example` 참고. 핵심 항목:

| 변수 | 설명 |
|---|---|
| `KAKAO_JAVASCRIPT_KEY` | 브라우저 SDK 로딩용 (공개 가능) |
| `KAKAO_REST_API_KEY` | 서버 전용 REST 호출 키 (클라이언트 노출 금지) |
| `ALLOWED_ORIGINS` | 운영 환경 CORS 허용 도메인 (미설정 시 production은 교차 출처 요청 기본 차단) |
| `RATE_LIMIT_MAX`, `REPORT_RATE_LIMIT_MAX` | API/제보 요청 속도 제한 |

카카오 키는 반드시 용도를 분리하고, 카카오 개발자 콘솔에 배포 도메인을 등록해야 지도/공유 기능이 정상 동작합니다.

## 최근 업데이트

- **2026-08-29**
  - Jest & Supertest 단위 및 API 통합 테스트 구축 (총 4개 수트, 43개 테스트 100% 통과)
  - `estimateParkingFee`, `distanceMeters`, `inferPriceProfile`, `normalizeExternalRows`, `mapOsmRowsToSpots`, `parseXmlRows`, SQLite DB 및 Express API 라우트 검증
  - GitHub Actions CI/CD 파이프라인에 `npm test` 자동 검증 단계 추가
  - Azure App Service 런타임을 `Node 22-lts`로 업데이트하여 native addon C++ 모듈 호환성 보장
  - 제보 데이터 SQLite(better-sqlite3) DB 마이그레이션 및 다중 이미지 파일 업로드(/api/upload) 구현
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

