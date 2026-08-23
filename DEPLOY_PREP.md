# 배포 전 준비 체크리스트 (MVP)

실행 권장 순서:
1. `npm install`
2. `npm run preflight`
3. `npm run start:prod`
4. `GET /api/health` 확인

빠른 5분 점검 명령:
1. `curl http://localhost:3000/api/health`
2. `curl "http://localhost:3000/api/kakao/places/search?query=주차장&x=127.024612&y=37.532600&radius=5000&size=3&page=1"`
3. `curl "http://localhost:3000/api/parking/unified-search?lat=37.532600&lng=127.024612&query=주차장"`

## 1. 기능 점검
- [ ] 지도 로딩 정상
- [ ] 검색어 입력 후 결과 마커 노출
- [ ] 카카오맵 열기/카카오톡 공유 버튼 동작
- [ ] 필터(전체/무료/조건부/공영) 정상 동작
- [ ] 마커 클릭 시 상세 바텀시트 노출
- [ ] 절약 금액 문구 정상 계산
- [ ] 제보 등록 성공 및 오류 처리 확인

## 2. API 점검
- [ ] GET /api/health 200 응답
- [ ] GET /api/parking/search 파라미터 검증
- [ ] GET /api/parking/:id 상세 응답 검증
- [ ] POST /api/reports validation/중복 처리 검증

## 3. 데이터/보안 점검
- [x] XSS: 결과 카드(`renderResultList`)에서 이스케이프 누락되었던 spot.name/address/badge escapeHtml 처리 완료
- [x] CORS: `ALLOWED_ORIGINS` 미설정 시 production에서는 브라우저 교차 출처 요청을 기본 차단하도록 변경 (same-origin/서버 간 호출은 영향 없음)
- [x] CSP: helmet Content-Security-Policy를 Report-Only로 활성화(카카오/leaflet/폰트 도메인 허용). 운영 배포 전 브라우저 콘솔에서 위반 로그가 없는지 확인 후 `reportOnly:false`로 전환 필요
- [x] Docker: 컨테이너를 non-root(`USER node`)로 실행하도록 변경
- [x] `npm audit` 0 vulnerabilities 확인
- [ ] 시드 데이터(주차장) 최신성 확인
- [ ] reports.json 파일 권한 확인
- [x] RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX / REPORT_RATE_LIMIT_MAX 운영값 설정 (기본값 존재, 운영 트래픽에 맞게 재조정 권장)
- [ ] POST /api/reports 과다요청 시 429 응답 확인
- [x] 에러 응답에 민감정보 미포함 (스택트레이스 노출 없음, 서버 콘솔에만 로깅)
- [x] image_urls에 비정상 URL(javascript:, data:) 차단 확인 (`isValidHttpUrl`이 http/https만 허용)

### 배포 직전 필수 조치 (Go-Live Blocker)
- [ ] `.env`의 운영 값 설정: `ALLOWED_ORIGINS`에 실제 프론트 도메인 등록 (미설정 시 production에서 API가 브라우저 교차 출처 요청을 거부함)
- [ ] 브라우저 DevTools > Console에서 CSP Report-Only 위반 로그 확인 → 문제 없으면 `server.js`의 `reportOnly: true`를 `false`로 전환
- [ ] 카카오 개발자 콘솔에 운영 도메인(HTTPS) 등록 (Maps/Share 모두)
- [ ] HTTPS 배포 필수: 나침반(DeviceOrientation), Web Share 등은 보안 컨텍스트(HTTPS)에서만 동작

## 4. 성능/UX 점검
- [ ] 모바일 viewport(375, 390, 430) 확인
- [ ] 첫 화면 로딩 체감 3초 이내
- [ ] 지도 인터랙션 중 프리즈 여부 확인

## 5. 운영 준비
- [ ] NODE_ENV=production
- [ ] PORT 설정
- [ ] PM2 또는 컨테이너 실행 방식 결정
- [ ] 로그 수집 방식 결정
- [ ] 카카오 개발자 콘솔에 운영 도메인 등록

## 6. 후속 권장
- [ ] 실제 지도 API(카카오/네이버)로 교체
- [ ] 이미지 URL 입력 대신 파일 업로드 API 도입
- [ ] DB 영속화(SQLite/PostgreSQL) 전환
