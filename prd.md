# PRD: 꿀주차 (KkulParking)

## 1. 문서 정보
- 문서명: Product Requirements Document (PRD)
- 제품명: 꿀주차 (KkulParking)
- 버전: v1.0 (MVP)
- 작성일: 2026-08-08
- 대상 릴리즈: 5주 MVP 릴리즈

## 2. 제품 개요
### 2.1 한 줄 정의
목적지 주변의 무료/조건부 무료/공영 주차장을 1초 내에 찾고, 가장 저렴한 주차 선택을 돕는 지도 기반 서비스.

### 2.2 해결하려는 문제
- 도심/핫플의 높은 주차비로 인한 비용 부담
- 주차 정보가 여러 채널(블로그/지도/앱)로 분산되어 탐색 시간이 길어짐
- 기존 주차 앱이 결제 중심이라 “절약” 니즈 대응이 약함

### 2.3 핵심 가치 제안
- 지도 1화면에서 주차 유형을 직관적으로 비교
- 조건부 무료(카페/마트 등) 주차 혜택을 구체 조건으로 안내
- 단순 정보 제공이 아니라 “얼마 절약되는지” 숫자로 제시

## 3. 목표와 범위
### 3.1 MVP 목표 (5주)
- 목적지 검색 후 반경 내 주차장 3유형을 지도에 표시
- 유형 필터(전체/무료/조건부/공영) 제공
- 주차장 상세 카드에서 비용/조건/거리 확인
- 가성비 비교 계산기로 예상 절약액 제시
- 사용자 제보(사진/영수증 포함) 등록 가능

### 3.2 성공 지표 (MVP KPI)
- 검색 후 첫 유효 결과 노출 시간: 2초 이내 (p75)
- 지도에서 상세 카드 오픈 전환율: 35% 이상
- 제보 등록 완료율(폼 진입 대비): 20% 이상
- 사용자 1회 검색 당 예상 절약액 표시율: 90% 이상
- 1주차 대비 5주차 데이터 커버리지(핫플 기준): +100% 이상

### 3.3 비목표 (MVP 제외)
- 주차권 결제/예약/정산 기능
- 실시간 주차 가능 대수의 고정밀 보장
- 전국 완전 커버리지 (초기: 서울 및 주요 도심 중심)
- 제보 자동 검증 AI (초기에는 운영자 승인 중심)

## 4. 타깃 사용자
### 4.1 페르소나 A
- 20대 후반 사회초년생, 데이트/핫플 방문 빈도 높음
- 니즈: 비싼 목적지 주차 대신 대체 주차 옵션 빠르게 탐색

### 4.2 페르소나 B
- 30대 초반 육아 운전자, 안전/편의/비용 모두 중요
- 니즈: 넓고 저렴한 공영 주차장, 마트 조건부 무료 주차 선호

## 5. 사용자 시나리오
### 시나리오 1: 핫플 방문 전 절약형 검색
1. 사용자가 목적지를 입력한다.
2. 지도에 3가지 유형 마커가 표시된다.
3. 조건부 무료 주차장 카드를 열어 조건을 확인한다.
4. 비교 계산기에서 목적지 직접 주차 대비 절약액을 확인한다.
5. 가장 유리한 주차장을 선택한다.

### 시나리오 2: 가족 외출 시 공영 주차장 우선 탐색
1. 사용자가 목적지를 검색한다.
2. 필터에서 “공영 주차장”만 선택한다.
3. 도보 거리와 운영 시간, 요금 정보를 비교한다.
4. 주차장을 확정하고 이동한다.

### 시나리오 3: 꿀팁 제보
1. 사용자가 제보하기 화면에 진입한다.
2. 위치, 무료 조건, 사진(영수증/안내판)을 입력한다.
3. 제출 후 “검수 대기” 상태를 확인한다.

## 6. 기능 요구사항 (Functional Requirements)
우선순위 정의:
- P0: MVP 필수
- P1: MVP 권장
- P2: 후속

### FR-01 목적지 검색 (P0)
- 주소/장소명 기반 검색 제공
- 검색 성공 시 지도 중심 좌표 이동
- 최근 검색어 최대 10개 저장

수용 기준:
- 유효 키워드 입력 시 2초 내 결과 리스트 노출
- 검색 결과 선택 시 해당 좌표로 지도 이동

### FR-02 통합 지도 마커 표출 (P0)
- 반경 내 주차장을 유형별 마커로 표시
- 마커 색상 규칙
  - 초록: 완전 무료
  - 노랑: 조건부 무료
  - 파랑: 공영 주차장
- 기본 반경: 1.5km (설정값)

수용 기준:
- 동일 좌표 데이터 중복 표출 없음
- 필터 변경 시 500ms 이내 마커 갱신

### FR-03 유형 필터 (P0)
- [전체] [완전 무료] [조건부 무료] [공영 주차장]
- 다중 선택 미지원(단일 선택)

수용 기준:
- 선택한 필터 유형 외 마커는 지도에서 즉시 숨김

### FR-04 주차장 상세 카드/바텀시트 (P0)
- 마커 클릭 시 바텀시트 표시
- 필수 정보
  - 주차장명
  - 주차 유형
  - 요금 또는 무료 조건
  - 운영 시간
  - 목적지까지 도보 거리(분)
  - 근거 이미지(영수증/안내판) 유무

수용 기준:
- 마커 클릭 후 300ms 내 바텀시트 애니메이션 시작
- 데이터 누락 시 “정보 확인 중” 플레이스홀더 노출

### FR-05 가성비 비교 계산기 (P0)
- 비교 항목
  - A안: 목적지 건물 주차 예상비
  - B안: 대체안(조건부 무료/공영) 예상비
- 절약액 = A안 - B안
- 절약 퍼센트 = (절약액 / A안) * 100

수용 기준:
- A안/B안 값이 있을 때 절약액 자동 계산
- 절약액 음수인 경우 “절약 없음” 라벨 노출

### FR-06 사용자 제보 등록 (UGC) (P1)
- 입력 필드
  - 위치(지도 선택 또는 주소)
  - 주차장명
  - 유형
  - 무료/할인 조건
  - 사진 업로드(최대 3장)
  - 메모
- 제출 후 상태: 검수 대기

수용 기준:
- 필수값 누락 시 제출 차단
- 이미지 파일 형식 제한(JPG/PNG/WebP), 개당 10MB 이하

### FR-07 관리자 검수 플로우 (P1)
- 상태: 대기/승인/반려
- 승인 시 지도 데이터에 반영

수용 기준:
- 반려 시 사유 기록 필수

## 7. 비기능 요구사항 (NFR)
### 성능
- 첫 화면 의미 있는 콘텐츠 표시(FCP): 2.5초 이내 (모바일 4G 기준)
- 지도 상호작용(팬/줌) 시 프레임 드랍 최소화

### 신뢰성
- 외부 지도 API 실패 시 재시도 1회 및 오류 안내 토스트
- 데이터 API 실패 시 마지막 성공 데이터 캐시 표시

### 보안/개인정보
- 제보 이미지 업로드 시 악성 확장자 차단
- 최소 수집 원칙 적용(개인식별정보 미수집)

### 접근성/반응형
- 모바일 우선 UI
- 주요 컨트롤 터치 영역 최소 44px
- 색상만으로 구분되지 않도록 마커 범례 텍스트 제공

## 8. 정보 구조 및 화면
### 화면 목록
- 메인/검색 화면
- 지도 결과 화면
- 주차장 상세 바텀시트
- 제보 등록 화면
- 제보 완료/상태 화면

### 핵심 UI 컴포넌트
- 검색바
- 카테고리 필터 탭
- 지도 캔버스 + 커스텀 마커
- 바텀시트 카드
- 비교 계산 패널
- 제보 폼 + 이미지 업로더

## 9. 데이터 모델 (초안)
### 9.1 parking_spot
- id (string)
- name (string)
- type (enum: FREE, CONDITIONAL, PUBLIC)
- lat (number)
- lng (number)
- base_fee (number, nullable)
- fee_unit_min (number, nullable)
- conditional_rule (string, nullable)
- operation_hours (string)
- source_type (enum: SEED, USER_REPORT, PUBLIC_API)
- status (enum: ACTIVE, INACTIVE)
- updated_at (datetime)

### 9.2 user_report
- id (string)
- parking_name (string)
- lat (number)
- lng (number)
- report_type (enum)
- rule_text (string)
- image_urls (array<string>)
- memo (string, nullable)
- review_status (enum: PENDING, APPROVED, REJECTED)
- reject_reason (string, nullable)
- created_at (datetime)

## 10. API 요구사항 (MVP 확정)

공통 규칙:
- Base URL: `/api`
- Content-Type: `application/json; charset=utf-8`
- 시간 포맷: ISO 8601 (예: `2026-08-08T09:00:00Z`)
- 금액 단위: KRW 정수(원)
- 거리 단위: meter

공통 응답 포맷:
```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_01J...",
    "timestamp": "2026-08-08T09:00:00Z"
  },
  "error": null
}
```

에러 응답 포맷:
```json
{
  "success": false,
  "data": null,
  "meta": {
    "request_id": "req_01J...",
    "timestamp": "2026-08-08T09:00:00Z"
  },
  "error": {
    "code": "INVALID_QUERY",
    "message": "lat and lng are required",
    "details": []
  }
}
```

### 10.1 검색 API
### GET /api/parking/search

설명:
- 목적지 중심 반경 내 주차장 목록 조회(지도 마커용)

Query Parameters:
- `lat` (number, required): 목적지 위도
- `lng` (number, required): 목적지 경도
- `radius` (number, optional, default=1500, min=100, max=5000): 검색 반경(m)
- `type` (string, optional, enum: `ALL`, `FREE`, `CONDITIONAL`, `PUBLIC`, default=`ALL`)
- `limit` (number, optional, default=100, max=200)
- `cursor` (string, optional): 페이지네이션 커서

Response `data`:
- `items` (array)
  - `id` (string)
  - `name` (string)
  - `type` (`FREE` | `CONDITIONAL` | `PUBLIC`)
  - `lat` (number)
  - `lng` (number)
  - `distance_m` (number)
  - `operation_hours` (string)
  - `summary_fee_text` (string, 예: `10분당 500원`)
  - `summary_rule_text` (string|null, 예: `1만원 이상 구매 시 1시간 무료`)
  - `has_evidence_image` (boolean)
- `next_cursor` (string|null)

샘플 응답:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "pk_101",
        "name": "성수 공영주차장",
        "type": "PUBLIC",
        "lat": 37.5451,
        "lng": 127.0558,
        "distance_m": 420,
        "operation_hours": "24시간",
        "summary_fee_text": "10분당 500원",
        "summary_rule_text": null,
        "has_evidence_image": true
      }
    ],
    "next_cursor": null
  },
  "meta": {
    "request_id": "req_01JABCD",
    "timestamp": "2026-08-08T09:00:00Z"
  },
  "error": null
}
```

상태코드:
- `200 OK`: 조회 성공
- `400 Bad Request`: 필수 파라미터 누락/형식 오류
- `500 Internal Server Error`: 서버 오류

### 10.2 상세 API
### GET /api/parking/{id}

설명:
- 주차장 상세 카드/바텀시트 데이터 조회

Path Parameters:
- `id` (string, required): 주차장 ID

Query Parameters:
- `dest_lat` (number, required): 현재 검색한 목적지 위도
- `dest_lng` (number, required): 현재 검색한 목적지 경도
- `stay_minutes` (number, optional, default=120, min=30, max=720): 예상 주차 시간(분)
- `destination_hourly_fee` (number, optional): 목적지 직접 주차 시간당 요금(원)

Response `data`:
- `id`, `name`, `type`, `lat`, `lng`
- `address` (string)
- `operation_hours` (string)
- `contact` (string|null)
- `fee_policy` (object)
  - `base_fee` (number|null)
  - `fee_unit_min` (number|null)
  - `extra_fee` (number|null)
  - `text` (string)
- `conditional_rule` (object|null)
  - `minimum_purchase` (number|null)
  - `free_minutes` (number|null)
  - `text` (string)
- `walk` (object)
  - `distance_m` (number)
  - `eta_min` (number)
- `evidence_images` (array<string>)
- `cost_compare` (object)
  - `destination_cost` (number|null)
  - `alternative_cost` (number)
  - `saving_amount` (number|null)
  - `saving_percent` (number|null)
  - `label` (string, 예: `약 10,000원 절약`)
- `updated_at` (datetime)

샘플 응답:
```json
{
  "success": true,
  "data": {
    "id": "pk_101",
    "name": "성수 공영주차장",
    "type": "PUBLIC",
    "lat": 37.5451,
    "lng": 127.0558,
    "address": "서울 성동구 ...",
    "operation_hours": "24시간",
    "contact": "02-123-4567",
    "fee_policy": {
      "base_fee": 500,
      "fee_unit_min": 10,
      "extra_fee": null,
      "text": "10분당 500원"
    },
    "conditional_rule": null,
    "walk": {
      "distance_m": 420,
      "eta_min": 7
    },
    "evidence_images": [
      "https://cdn.example.com/evidence/pk_101_1.jpg"
    ],
    "cost_compare": {
      "destination_cost": 15000,
      "alternative_cost": 6000,
      "saving_amount": 9000,
      "saving_percent": 60,
      "label": "약 9,000원 절약"
    },
    "updated_at": "2026-08-07T12:00:00Z"
  },
  "meta": {
    "request_id": "req_01JEFGH",
    "timestamp": "2026-08-08T09:01:00Z"
  },
  "error": null
}
```

상태코드:
- `200 OK`: 조회 성공
- `404 Not Found`: 존재하지 않는 주차장 ID
- `400 Bad Request`: 필수 파라미터 오류
- `500 Internal Server Error`: 서버 오류

### 10.3 제보 등록 API
### POST /api/reports

설명:
- 사용자 꿀팁 제보 등록(검수 전 `PENDING` 상태)

Request Body:
- `parking_name` (string, required, 2~100자)
- `type` (string, required, enum: `FREE`, `CONDITIONAL`, `PUBLIC`)
- `lat` (number, required)
- `lng` (number, required)
- `address` (string, optional)
- `rule_text` (string, required, 5~500자)
- `operation_hours` (string, optional)
- `image_urls` (array<string>, required, 1~3개)
- `memo` (string, optional, 최대 1000자)
- `reporter_nickname` (string, optional, 최대 30자)

요청 예시:
```json
{
  "parking_name": "OO카페 성수점",
  "type": "CONDITIONAL",
  "lat": 37.5441,
  "lng": 127.0561,
  "address": "서울 성동구 ...",
  "rule_text": "1만원 이상 구매 시 1시간 무료",
  "operation_hours": "09:00-22:00",
  "image_urls": [
    "https://cdn.example.com/reports/tmp_a.jpg"
  ],
  "memo": "주말엔 혼잡",
  "reporter_nickname": "민수"
}
```

Response `data`:
- `report_id` (string)
- `review_status` (`PENDING`)
- `created_at` (datetime)

샘플 응답:
```json
{
  "success": true,
  "data": {
    "report_id": "rp_9001",
    "review_status": "PENDING",
    "created_at": "2026-08-08T09:02:00Z"
  },
  "meta": {
    "request_id": "req_01JXYZ1",
    "timestamp": "2026-08-08T09:02:00Z"
  },
  "error": null
}
```

상태코드:
- `201 Created`: 등록 성공
- `400 Bad Request`: 필수값/형식 오류
- `413 Payload Too Large`: 업로드 용량 제한 초과
- `422 Unprocessable Entity`: 비즈니스 검증 실패(중복 제보 등)
- `500 Internal Server Error`: 서버 오류

### 10.4 공통 에러 코드
- `INVALID_QUERY`: query parameter 오류
- `INVALID_BODY`: body validation 오류
- `PARKING_NOT_FOUND`: 주차장 ID 없음
- `DUPLICATE_REPORT`: 중복 제보 감지
- `IMAGE_LIMIT_EXCEEDED`: 이미지 개수/용량 제한 초과
- `INTERNAL_ERROR`: 처리 중 예외

### GET /api/reports/{id}
- response: 검수 상태

### GET /api/meta/popular-destinations
- response: 인기 검색 목적지 리스트

## 11. 계산 로직 정의
- 목적지 직접 주차비(A):
  - A = 목적지_시간당요금 * 예상주차시간
- 대체 주차비(B):
  - 공영: 시간요금 * 예상주차시간
  - 조건부: max(0, 구매금액 + 초과주차비)
- 절약액:
  - save = A - B

예시:
- A = 15,000원
- B = 5,000원
- save = 10,000원

## 12. 운영 정책
- 제보 데이터 반영 전 운영자 승인 필수
- 동일 장소 중복 제보는 병합 처리
- 오래된 조건부 무료 정보는 만료 후보로 자동 표시(예: 90일 무검증)

## 13. 분석 이벤트 (Analytics)
- search_submitted
- filter_changed
- marker_clicked
- bottom_sheet_opened
- calculator_viewed
- report_started
- report_submitted
- report_submit_failed

필수 속성:
- destination
- selected_filter
- parking_type
- estimated_saving

## 14. 기술 스택 제안 (MVP)
- 프론트엔드: 지도 SDK + 반응형 웹
- 백엔드: REST API 서버
- DB: 주차장/제보 데이터 저장 가능한 RDB 또는 문서DB
- 저장소: 제보 이미지 파일 스토리지

참고:
- 실제 지도 SDK(네이버/카카오)와 DB 종류는 팀 보유 역량에 맞춰 최종 확정

## 15. 5주 실행 계획
### 1주차
- 기능 명세/와이어프레임 확정
- 지도 API 키 발급 및 공공데이터 API 신청
- 개발 환경 세팅

### 2주차
- UI 디자인 완료
- 시드 DB 50~100건 구축

### 3주차
- 지도 연동, 검색, 필터 구현
- 마커 표출 및 데이터 연동

### 4주차
- 상세 바텀시트, 비교 계산기, 제보 폼 구현
- 프론트-백엔드 API 통합

### 5주차
- 통합 QA(모바일 포함)
- 성능 최적화
- 배포 및 초기 바이럴 시작

## 16. QA 및 수용 테스트 항목
- 검색 키워드 정상/오타/빈값 처리
- 필터 변경 시 마커 정확도
- 바텀시트 필수 정보 누락 처리
- 계산기 금액 계산 정확성
- 제보 이미지 업로드 제한 검증
- 모바일(iOS/Android) 터치/스크롤/지도 이동 검증

## 17. 리스크와 대응
- 조건부 무료 정보의 최신성 저하
  - 대응: 만료 정책 + 재검증 요청 UI
- 공공데이터 품질 편차
  - 대응: 다중 소스 병합 + 운영자 정제
- 초기 데이터 부족
  - 대응: 시드 데이터 우선 확보 + 제보 유도 캠페인

## 18. 오픈 이슈 (결정 필요)
- 기본 검색 반경(1km/1.5km/2km) 최종값
- 예상 주차시간 기본값(예: 2시간)
- 제보 신뢰도 점수 체계 도입 여부
- 로그인 도입 시점(익명 제보 허용 범위)

## 19. 출시 기준 (Go/No-Go)
다음 조건을 모두 충족하면 MVP 출시:
- P0 기능 100% 완료
- 치명 버그(크래시/데이터 손상) 0건
- 주요 시나리오(검색→비교→선택) 성공률 95% 이상
- API 오류율 1% 미만

---

## 부록 A. 요구사항 추적표 (요약)
- FR-01 검색: P0
- FR-02 지도/마커: P0
- FR-03 필터: P0
- FR-04 상세 카드: P0
- FR-05 비교 계산기: P0
- FR-06 제보 등록: P1
- FR-07 관리자 검수: P1
