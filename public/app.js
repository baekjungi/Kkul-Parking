let map = null;
let leafletRoadLayer = null;
let leafletSatelliteLayer = null;
let refreshTimer = null;

function toKakaoLevel(zoom) {
  const z = Number(zoom || 14);
  if (z >= 16) return 3;
  if (z >= 15) return 4;
  if (z >= 14) return 5;
  if (z >= 13) return 6;
  if (z >= 12) return 7;
  return 8;
}

function setMapView(lat, lng, zoom = 14) {
  if (!map) {
    return;
  }

  if (state.mapEngine === "KAKAO" && window.kakao?.maps) {
    map.setCenter(new window.kakao.maps.LatLng(lat, lng));
    map.setLevel(toKakaoLevel(zoom));
    return;
  }

  if (state.mapEngine === "LEAFLET" && window.L) {
    map.setView([lat, lng], zoom);
  }
}

const state = {
  center: { lat: 37.5519, lng: 126.9918 },
  type: "ALL",
  layer: "ALL",
  searchKeyword: "",
  nationwide: false,
  realtime: true,
  sourceFilter: "ALL",
  distanceFilter: "ALL",
  sortBy: "DIST",
  favoriteOnly: false,
  onlyRealData: false,
  mapMode: "ROADMAP",
  selectedSpot: null,
  mapEngine: "KAKAO",
  markers: [],
  myLocationMarker: null,
  myLocationCircle: null,
  destinationHourlyFee: 7500,
  stayMinutes: 120,
  lastRenderedSpots: [],
  favorites: new Set(),
  reportPhotos: [],
  locateMode: "idle",
  geoWatchId: null,
  lastPosition: null,
  currentHeading: null,
  compassEventName: null,
  compassSignalReceived: false,
  kakao: {
    enabled: false,
    restEnabled: false,
    javascriptKey: "",
    placesService: null
  },
  sources: {
    local: 0,
    kakao: 0,
    gongyu: 0,
    datago: 0
  }
};

const elements = {
  chips: Array.from(document.querySelectorAll(".chip")),
  typeChips: Array.from(document.querySelectorAll(".chip[data-type]")),
  layerChips: Array.from(document.querySelectorAll(".layer-chip")),
  mapStatus: document.getElementById("map-status"),
  emptyState: document.getElementById("empty-state"),
  emptyAction: document.getElementById("empty-action"),
  miniCard: document.getElementById("mini-card"),
  miniName: document.getElementById("mini-name"),
  miniType: document.getElementById("mini-type"),
  detailSheet: document.getElementById("detail-sheet"),
  detailSheetHandle: document.querySelector("#detail-sheet .sheet-handle"),
  detailHead: document.querySelector("#detail-sheet .detail-head"),
  detailName: document.getElementById("detail-name"),
  detailWalk: document.getElementById("detail-walk"),
  savingTitle: document.getElementById("saving-title"),
  savingSub: document.getElementById("saving-sub"),
  detailFee: document.getElementById("detail-fee"),
  detailExtra: document.getElementById("detail-extra"),
  detailAddress: document.getElementById("detail-address"),
  detailHours: document.getElementById("detail-hours"),
  nearbyStatus: document.getElementById("nearby-status"),
  nearbyList: document.getElementById("nearby-list"),
  searchForm: document.getElementById("search-form"),
  destinationInput: document.getElementById("destination-input"),
  popularKeywords: Array.from(document.querySelectorAll(".keyword-chip")),
  resultList: document.getElementById("result-list"),
  discoverPanel: document.getElementById("discover-panel"),
  panelDragHandle: document.getElementById("panel-drag-handle"),
  focusMapBtn: document.getElementById("focus-map-btn"),
  nationwideToggle: document.getElementById("nationwide-toggle"),
  realtimeToggle: document.getElementById("realtime-toggle"),
  distanceFilter: document.getElementById("distance-filter"),
  stayFilter: document.getElementById("stay-filter"),
  sortFilter: document.getElementById("sort-filter"),
  budgetInput: document.getElementById("budget-input"),
  budgetApplyBtn: document.getElementById("budget-apply-btn"),
  openKakaoMapBtn: document.getElementById("open-kakao-map-btn"),
  shareKakaoTalkBtn: document.getElementById("share-kakao-talk-btn"),
  locateBtn: document.getElementById("locate-btn"),
  compassIndicator: document.getElementById("compass-indicator"),
  refreshBtn: document.getElementById("refresh-btn"),
  mapModeBtn: document.getElementById("map-mode-btn"),
  reportPanel: document.getElementById("report-panel"),
  reportForm: document.getElementById("report-form"),
  photoFileInput: document.getElementById("photo-file-input"),
  photoPreviewList: document.getElementById("photo-preview-list"),
  reportTypeItems: Array.from(document.querySelectorAll(".tip-type-item")),
  mapPickerBtn: document.querySelector(".map-picker-btn"),
  reportResult: document.getElementById("report-result"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),
  showReportTab: document.getElementById("show-report-tab"),
  openPlaceLink: document.getElementById("open-place-link"),
  navStart: document.getElementById("nav-start")
};

let statusTimer = null;

function resetDetailSheetPosition() {
  if (!elements.detailSheet) {
    return;
  }
  elements.detailSheet.style.transform = "translateY(0)";
}

function initDetailSheetDragControl() {
  if (!elements.detailSheet || !elements.detailSheetHandle) {
    return;
  }

  let dragging = false;
  let startY = 0;
  let deltaY = 0;

  const canStartDrag = (target) => {
    if (!target) return false;
    return Boolean(
      target.closest(".sheet-handle") ||
      target.closest(".detail-head")
    );
  };

  const beginDrag = (y) => {
    dragging = true;
    startY = y;
    deltaY = 0;
    document.body.style.userSelect = "none";
    elements.detailSheet.style.transition = "none";
  };

  const onDragMove = (clientY) => {
    if (!dragging) {
      return;
    }

    deltaY = Math.max(0, clientY - startY);
    elements.detailSheet.style.transform = `translateY(${deltaY}px)`;
  };

  const endDrag = () => {
    if (!dragging) {
      return;
    }

    dragging = false;
    document.body.style.userSelect = "";
    elements.detailSheet.style.transition = "transform 0.18s ease";

    if (deltaY > 120) {
      hideDetail();
      hideMiniCard();
      setTimeout(() => {
        if (elements.detailSheet) {
          elements.detailSheet.style.transition = "";
        }
      }, 220);
      return;
    }

    resetDetailSheetPosition();
    setTimeout(() => {
      if (elements.detailSheet) {
        elements.detailSheet.style.transition = "";
      }
    }, 220);
  };

  elements.detailSheet.addEventListener("pointerdown", (event) => {
    if (elements.detailSheet.classList.contains("hidden")) return;
    if (!canStartDrag(event.target)) return;
    beginDrag(event.clientY);
  });

  elements.detailSheet.addEventListener("pointermove", (event) => {
    onDragMove(event.clientY);
  });

  elements.detailSheet.addEventListener("pointerup", () => {
    endDrag();
  });

  elements.detailSheet.addEventListener("pointercancel", () => {
    endDrag();
  });

  elements.detailSheet.addEventListener("touchstart", (event) => {
    if (elements.detailSheet.classList.contains("hidden")) return;
    if (!canStartDrag(event.target)) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    beginDrag(touch.clientY);
  }, { passive: true });

  elements.detailSheet.addEventListener("touchmove", (event) => {
    if (!dragging) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    event.preventDefault();
    onDragMove(touch.clientY);
  }, { passive: false });

  elements.detailSheet.addEventListener("touchend", () => {
    endDrag();
  });

  elements.detailSheet.addEventListener("touchcancel", () => {
    endDrag();
  });
}

function initPanelDragControl() {
  if (!elements.discoverPanel || !elements.panelDragHandle) {
    return;
  }

  let dragging = false;
  let startY = 0;
  let startHeight = 0;

  const getMinHeight = () => 150;
  const getMaxHeight = () => Math.min(Math.round(window.innerHeight * 0.72), 560);

  const getCurrentHeight = () => {
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue("--panel-h").trim();
    const parsed = Number(cssVar.replace("px", ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return elements.discoverPanel.getBoundingClientRect().height || 300;
  };

  const applyPanelHeight = (height) => {
    const min = getMinHeight();
    const max = getMaxHeight();
    const next = Math.max(min, Math.min(Math.round(height), max));
    document.documentElement.style.setProperty("--panel-h", `${next}px`);
  };

  const onPointerMove = (event) => {
    if (!dragging) {
      return;
    }
    const delta = startY - event.clientY;
    applyPanelHeight(startHeight + delta);
  };

  const stopDragging = () => {
    dragging = false;
    document.body.style.userSelect = "";
  };

  elements.panelDragHandle.addEventListener("pointerdown", (event) => {
    dragging = true;
    startY = event.clientY;
    startHeight = getCurrentHeight();
    document.body.style.userSelect = "none";
    elements.panelDragHandle.setPointerCapture(event.pointerId);
  });

  elements.panelDragHandle.addEventListener("pointermove", onPointerMove);
  elements.panelDragHandle.addEventListener("pointerup", stopDragging);
  elements.panelDragHandle.addEventListener("pointercancel", stopDragging);

  elements.panelDragHandle.addEventListener("dblclick", () => {
    const current = getCurrentHeight();
    const min = getMinHeight();
    const max = getMaxHeight();
    const midpoint = (min + max) / 2;
    applyPanelHeight(current > midpoint ? min : max);
  });

  window.addEventListener("resize", () => {
    applyPanelHeight(getCurrentHeight());
  });
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem("kkulparking:favorites");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.favorites = new Set(parsed.filter((item) => typeof item === "string"));
    }
  } catch (error) {
    state.favorites = new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem("kkulparking:favorites", JSON.stringify(Array.from(state.favorites)));
  } catch (error) {
    // ignore storage errors
  }
}

function spotKey(spot) {
  if (!spot) return "";
  if (spot.id) return String(spot.id);
  return `${spot.source || "SPOT"}_${Math.round(Number(spot.lat || 0) * 10000)}_${Math.round(Number(spot.lng || 0) * 10000)}_${spot.name || ""}`;
}

function isFavoriteSpot(spot) {
  const key = spotKey(spot);
  return key ? state.favorites.has(key) : false;
}

function toggleFavoriteBySpot(spot) {
  const key = spotKey(spot);
  if (!key) return false;

  if (state.favorites.has(key)) {
    state.favorites.delete(key);
    saveFavorites();
    return false;
  }

  state.favorites.add(key);
  saveFavorites();
  return true;
}

function syncFavoriteButton() {
  const button = document.querySelector(".fav-btn");
  if (!button || !state.selectedSpot) {
    return;
  }

  const active = isFavoriteSpot(state.selectedSpot);
  button.textContent = active ? "♥" : "♡";
  button.setAttribute("aria-label", active ? "저장됨" : "저장");
}

function showStatus(message, timeout = 1400) {
  elements.mapStatus.textContent = message;
  elements.mapStatus.classList.remove("hidden");

  if (statusTimer) {
    clearTimeout(statusTimer);
  }

  if (timeout > 0) {
    statusTimer = setTimeout(() => {
      elements.mapStatus.classList.add("hidden");
    }, timeout);
  }
}

function hideDetail() {
  resetDetailSheetPosition();
  elements.detailSheet.classList.add("hidden");
}

function hideMiniCard() {
  elements.miniCard.classList.add("hidden");
}

function showEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.remove("hidden");
  }
}

function hideEmptyState() {
  if (elements.emptyState) {
    elements.emptyState.classList.add("hidden");
  }
}

function markerIcon(type) {
  return {
    label: type === "FREE" ? "무료" : type === "CONDITIONAL" ? "제휴" : "공영"
  };
}

function markerInfoLine(spot) {
  if (spot.summary_fee_text) {
    return spot.summary_fee_text;
  }
  if (spot.fee_policy?.text) {
    return spot.fee_policy.text;
  }
  const source = String(spot.source || "");
  if (source.startsWith("DATA_GO")) {
    return "공공데이터 제공";
  }
  if (source === "GONGYU") {
    return "공유누리 제공";
  }
  if (source === "KAKAO") {
    return "카카오 장소 정보";
  }
  return "상세 정보 준비 중";
}

function spotAddressText(spot) {
  if (!spot) {
    return "";
  }
  return spot.address || spot.road_address_name || spot.address_name || spot.addr || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapLabelHtml(spot) {
  return `<div class="map-info-label"><strong>${escapeHtml(spot.name)}</strong><span>${escapeHtml(markerInfoLine(spot))}</span></div>`;
}

function mapOsmRowsToSpots(rows, idPrefix = "osm") {
  return rows
    .map((row, index) => {
      const rowLat = Number(row.lat);
      const rowLng = Number(row.lon);
      if (!Number.isFinite(rowLat) || !Number.isFinite(rowLng)) {
        return null;
      }

      const nameFromAddress = row.address?.amenity || row.address?.building;
      const name = row.name || nameFromAddress || "주차 위치";
      const combinedText = `${name} ${row.display_name || ""}`.toLowerCase();
      if (!combinedText.includes("주차") && !combinedText.includes("parking")) {
        return null;
      }

      return {
        id: `${idPrefix}_${index}_${rowLat}_${rowLng}`,
        name,
        type: "PUBLIC",
        layer: "PARKING",
        lat: rowLat,
        lng: rowLng,
        distance_m: distanceMeters(state.center.lat, state.center.lng, rowLat, rowLng),
        operation_hours: "운영시간 정보 없음",
        summary_fee_text: "현장 확인 필요",
        summary_rule_text: null,
        has_evidence_image: false,
        source: "OSM",
        road_address_name: row.display_name,
        address_name: row.display_name,
        place_url: `https://www.openstreetmap.org/?mlat=${rowLat}&mlon=${rowLng}#map=17/${rowLat}/${rowLng}`,
        phone: null
      };
    })
    .filter(Boolean);
}

function createKakaoMarkerImage() {
  if (!window.kakao?.maps?.MarkerImage || !window.kakao?.maps?.Size) {
    return null;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 34 44"><path fill="#1c55f2" d="M17 0C7.611 0 0 7.611 0 17c0 12.75 15.479 26.25 16.138 26.812a1.3 1.3 0 0 0 1.724 0C18.521 43.25 34 29.75 34 17 34 7.611 26.389 0 17 0Zm0 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/></svg>`;
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new window.kakao.maps.MarkerImage(dataUrl, new window.kakao.maps.Size(24, 32));
}

function markerIconForSpot(spot) {
  if (spot.source === "LOCAL") {
    return markerIcon(spot.type);
  }

  let label = "외부";
  let icon = "📍";
  if (spot.source === "GONGYU") {
    label = "공유";
    icon = "🧩";
  } else if (String(spot.source || "").startsWith("DATA_GO")) {
    label = "공공";
    icon = "🏛";
  } else if (spot.layer === "BUILDING") {
    label = "건물";
    icon = "🏢";
  } else if (spot.layer === "FACILITY") {
    label = "시설";
    icon = "🏪";
  } else {
    label = "공영";
    icon = "Ⓟ";
  }

  return {
    label: `${icon} ${label}`
  };
}

function won(number) {
  return `${Number(number || 0).toLocaleString("ko-KR")}원`;
}

function textPriceFromSpot(spot) {
  if (spot.summary_fee_text) {
    return spot.summary_fee_text;
  }
  if (spot.fee_policy?.text) {
    return spot.fee_policy.text;
  }
  return "요금 정보 확인 필요";
}

function normalizeSourceForFilter(source) {
  const value = String(source || "");
  if (value.startsWith("DATA_GO")) {
    return "DATA_GO";
  }
  return value;
}

function categoryLabel(code) {
  if (code === "FD6") return "맛집";
  if (code === "CE7") return "카페";
  if (code === "AT4") return "명소";
  return "장소";
}

function renderNearbyList(items) {
  if (!elements.nearbyStatus || !elements.nearbyList) {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    elements.nearbyStatus.textContent = "주변 정보 없음";
    elements.nearbyList.innerHTML = `
      <article class="nearby-item">
        <strong class="nearby-name">표시할 주변 장소가 없어요</strong>
        <div class="nearby-meta">지도를 이동하거나 다른 주차장을 선택해보세요.</div>
      </article>
    `;
    return;
  }

  elements.nearbyStatus.textContent = `${items.length}곳`;
  elements.nearbyList.innerHTML = items
    .slice(0, 8)
    .map((item) => {
      const distance = Number(item.distance_m || 0);
      const address = item.road_address_name || item.address_name || "주소 정보 없음";
      return `
        <article class="nearby-item" data-nearby-url="${escapeHtml(item.place_url || "")}">
          <div class="nearby-item-top">
            <h4 class="nearby-name">${escapeHtml(item.name)}</h4>
            <span class="nearby-badge">${categoryLabel(item.category_group_code)}</span>
          </div>
          <div class="nearby-meta">도보 약 ${Math.max(1, Math.round(distance / 70))}분 (${distance}m)</div>
          <div class="nearby-meta">${escapeHtml(address)}</div>
        </article>
      `;
    })
    .join("");

  const cards = Array.from(elements.nearbyList.querySelectorAll("[data-nearby-url]"));
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.getAttribute("data-nearby-url");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  });
}

async function loadNearbyHotspots(lat, lng) {
  if (!elements.nearbyStatus || !elements.nearbyList) {
    return;
  }

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    renderNearbyList([]);
    return;
  }

  elements.nearbyStatus.textContent = "불러오는 중...";
  elements.nearbyList.innerHTML = "";

  const categories = ["FD6", "CE7", "AT4"];
  const settled = await Promise.allSettled(
    categories.map((code) =>
      searchKakaoCategories(code, {
        x: Number(lng),
        y: Number(lat),
        radius: 1800,
        size: 6,
        page: 1
      })
    )
  );

  const rows = settled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value)
    .map((place) => ({
      ...place,
      lat: Number(place.lat),
      lng: Number(place.lng),
      distance_m: Number(place.distance_m || distanceMeters(Number(lat), Number(lng), Number(place.lat), Number(place.lng)))
    }));

  const deduped = dedupeByLocation(
    rows.map((item) => ({
      ...item,
      layer: "FACILITY"
    }))
  ).sort((a, b) => Number(a.distance_m || 999999) - Number(b.distance_m || 999999));

  renderNearbyList(deduped);
}

function inferPriceProfile(spot) {
  const text = `${spot.name || ""} ${spot.category_name || ""}`.toLowerCase();
  if (text.includes("공영")) {
    return { base30: 1000, per10: 300, note: "공영 평균" };
  }
  if (text.includes("백화점") || text.includes("마트") || text.includes("몰") || text.includes("쇼핑")) {
    return { base30: 2000, per10: 500, freeUntilMin: 120, note: "상업시설 평균(조건부 무료 가능)" };
  }
  if (text.includes("역") || text.includes("환승")) {
    return { base30: 1500, per10: 400, note: "역세권 평균" };
  }
  return { base30: 2000, per10: 500, note: "민영 평균" };
}

function estimateParkingFee(spot, stayMinutes) {
  const minutes = Math.max(30, Number(stayMinutes || 120));
  const profile = inferPriceProfile(spot);

  if (profile.freeUntilMin && minutes <= profile.freeUntilMin) {
    return {
      amount: 0,
      note: `${profile.note} · ${Math.floor(profile.freeUntilMin / 60)}시간 무료 가능`
    };
  }

  const extraMinutes = Math.max(0, minutes - 30);
  const extraBlocks = Math.ceil(extraMinutes / 10);
  const amount = profile.base30 + extraBlocks * profile.per10;
  return {
    amount,
    note: `${profile.note} · 30분 ${won(profile.base30)} + 10분당 ${won(profile.per10)}`
  };
}

function applyClientFilters(spots) {
  let filtered = Array.isArray(spots) ? [...spots] : [];

  if (state.onlyRealData) {
    filtered = filtered.filter((spot) => String(spot.source || "") !== "LOCAL");
  }

  if (state.sourceFilter !== "ALL") {
    filtered = filtered.filter((spot) => normalizeSourceForFilter(spot.source) === state.sourceFilter);
  }

  if (state.distanceFilter !== "ALL") {
    const maxDistance = Number(state.distanceFilter);
    filtered = filtered.filter((spot) => Number(spot.distance_m || Number.MAX_SAFE_INTEGER) <= maxDistance);
  }

  if (state.favoriteOnly) {
    filtered = filtered.filter((spot) => isFavoriteSpot(spot));
  }

  if (state.sortBy === "NAME") {
    filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko"));
  } else if (state.sortBy === "FEE") {
    filtered.sort((a, b) => estimateParkingFee(a, state.stayMinutes).amount - estimateParkingFee(b, state.stayMinutes).amount);
  } else {
    filtered.sort((a, b) => Number(a.distance_m || Number.MAX_SAFE_INTEGER) - Number(b.distance_m || Number.MAX_SAFE_INTEGER));
  }

  return filtered;
}

function updateRealtimeRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (!state.realtime) {
    return;
  }

  refreshTimer = setInterval(() => {
    if (!elements.reportPanel.classList.contains("hidden")) {
      return;
    }
    renderMarkers().catch(() => {
      showStatus("실시간 갱신에 실패했어요.", 1200);
    });
  }, 45000);
}

async function diagnoseSourceHealth() {
  try {
    const config = await apiGet("/api/config/client");
    const warnings = [];

    if (config.kakao_rest_enabled) {
      try {
        const testParams = new URLSearchParams({
          query: "주차장",
          x: String(state.center.lng),
          y: String(state.center.lat),
          radius: "3000",
          size: "1",
          page: "1"
        });
        await apiGet(`/api/kakao/places/search?${testParams.toString()}`);
      } catch (error) {
        warnings.push("카카오 REST 권한 오류(403)");
      }
    } else {
      warnings.push("카카오 REST 키 미설정");
    }

    if (warnings.length > 0) {
      showStatus(`외부 데이터 제한: ${warnings.join(" / ")}`, 3800);
    }
  } catch (error) {
    // ignore diagnostics errors
  }
}

function renderResultList(spots) {
  if (!elements.resultList) {
    return;
  }

  const topItems = spots.slice(0, 28);
  if (topItems.length === 0) {
    elements.resultList.innerHTML = `
      <article class="result-card">
        <div class="result-name">표시할 주차장이 없습니다</div>
        <div class="result-address">검색어를 바꾸거나 내 위치 버튼을 눌러보세요.</div>
      </article>
    `;
    showEmptyState();
    return;
  }

  hideEmptyState();

  elements.resultList.innerHTML = topItems
    .map((spot, index) => {
      const distance = Number(spot.distance_m || 0);
      const minute = Math.max(1, Math.round(distance / 70));
      const estimated = estimateParkingFee(spot, state.stayMinutes);
      const address = spotAddressText(spot) || "주소 정보 없음";
      const badge =
        normalizeSourceForFilter(spot.source) === "DATA_GO"
          ? "공공데이터"
          : spot.source === "KAKAO"
          ? "카카오"
          : spot.source === "GONGYU"
          ? "공유누리"
          : spot.source;
      const favoriteMark = isFavoriteSpot(spot) ? "<span class=\"fav-mark\">저장됨</span>" : "";
      return `
        <article class="result-card" data-result-index="${index}">
          <div class="result-top">
            <div class="result-top-left">
              <h4 class="result-name">${escapeHtml(spot.name)}</h4>
              ${favoriteMark}
            </div>
            <span class="result-distance">도보 ${minute}분 (${distance}m)</span>
          </div>
          <div class="result-address">${escapeHtml(address)}</div>
          <div class="result-foot">
            <span class="result-price">예상 ${Math.floor(state.stayMinutes / 60)}시간 ${won(estimated.amount)}</span>
            <span class="result-badge">${escapeHtml(badge)}</span>
          </div>
          <div class="result-address">${escapeHtml(estimated.note)}</div>
        </article>
      `;
    })
    .join("");

  const cards = Array.from(elements.resultList.querySelectorAll("[data-result-index]"));
  cards.forEach((card) => {
    card.addEventListener("click", async () => {
      const index = Number(card.getAttribute("data-result-index"));
      const spot = topItems[index];
      if (!spot) return;

      setMapView(spot.lat, spot.lng, 15);
      if (spot.source === "LOCAL") {
        await openDetail(spot.id);
      } else {
        openExternalDetail(spot);
      }
    });
  });
}

async function apiGet(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "API error");
  }
  return payload.data;
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message || "API error");
  }
  return payload.data;
}

function clearMarkers() {
  state.markers.forEach((marker) => {
    if (typeof marker.remove === "function") {
      marker.remove();
    } else if (typeof marker.setMap === "function") {
      marker.setMap(null);
    }
  });
  state.markers = [];
}

function updateMapModeButton() {
  if (!elements.mapModeBtn) {
    return;
  }
  const isSatellite = state.mapMode === "SATELLITE";
  elements.mapModeBtn.textContent = isSatellite ? "일반" : "위성";
  elements.mapModeBtn.classList.toggle("satellite", isSatellite);
}

function applyMapMode() {
  if (!map) {
    return;
  }

  if (state.mapEngine === "KAKAO" && window.kakao?.maps?.MapTypeId) {
    const mapType =
      state.mapMode === "SATELLITE"
        ? window.kakao.maps.MapTypeId.HYBRID
        : window.kakao.maps.MapTypeId.ROADMAP;
    map.setMapTypeId(mapType);
    updateMapModeButton();
    return;
  }

  if (state.mapEngine === "LEAFLET" && window.L && leafletRoadLayer && leafletSatelliteLayer) {
    if (state.mapMode === "SATELLITE") {
      if (map.hasLayer(leafletRoadLayer)) {
        map.removeLayer(leafletRoadLayer);
      }
      if (!map.hasLayer(leafletSatelliteLayer)) {
        leafletSatelliteLayer.addTo(map);
      }
    } else {
      if (map.hasLayer(leafletSatelliteLayer)) {
        map.removeLayer(leafletSatelliteLayer);
      }
      if (!map.hasLayer(leafletRoadLayer)) {
        leafletRoadLayer.addTo(map);
      }
    }
    updateMapModeButton();
  }
}

function toggleMapMode() {
  state.mapMode = state.mapMode === "SATELLITE" ? "ROADMAP" : "SATELLITE";
  applyMapMode();
  showStatus(state.mapMode === "SATELLITE" ? "위성 지도로 전환했어요." : "일반 지도로 전환했어요.", 1200);
}

function createSpotMarker(spot, onClick) {
  const withLabel = false;

  if (state.mapEngine === "KAKAO" && window.kakao?.maps) {
    const position = new window.kakao.maps.LatLng(spot.lat, spot.lng);
    const image = createKakaoMarkerImage();
    const marker = new window.kakao.maps.Marker({
      position,
      title: spot.name,
      image: image || undefined
    });
    marker.setMap(map);
    window.kakao.maps.event.addListener(marker, "click", onClick);

    return {
      marker,
      remove() {
        marker.setMap(null);
      }
    };
  }

  if (state.mapEngine === "LEAFLET" && window.L) {
    const pinIcon = window.L.divIcon({
      className: "",
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 34 44"><path fill="#1c55f2" d="M17 0C7.611 0 0 7.611 0 17c0 12.75 15.479 26.25 16.138 26.812a1.3 1.3 0 0 0 1.724 0C18.521 43.25 34 29.75 34 17 34 7.611 26.389 0 17 0Zm0 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/></svg>'
    });
    const marker = window.L.marker([spot.lat, spot.lng], { icon: pinIcon }).addTo(map);
    marker.on("click", onClick);
    if (withLabel) {
      marker.bindTooltip(mapLabelHtml(spot), {
        permanent: false,
        direction: "top",
        offset: [0, -32],
        className: "map-tooltip",
        opacity: 1
      });
    }
    return {
      marker,
      remove() {
        marker.remove();
      }
    };
  }

  return {
    remove() {}
  };
}

function locationIndicatorHtml(heading) {
  if (heading === null) {
    return `<div class="loc-dot"></div>`;
  }
  return `<div class="loc-arrow" style="transform: rotate(${heading}deg)">
      <svg viewBox="0 0 24 24" width="26" height="26">
        <path d="M12 1.5 18.5 20 12 16.2 5.5 20Z" fill="#ff6a1a" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
    </div>`;
}

function setMyLocationIndicator(lat, lng, accuracy = 120, heading = null) {
  if (state.mapEngine === "KAKAO" && window.kakao?.maps) {
    if (state.myLocationMarker) {
      state.myLocationMarker.setMap(null);
    }
    if (state.myLocationCircle) {
      state.myLocationCircle.setMap(null);
    }

    const center = new window.kakao.maps.LatLng(lat, lng);

    const content = document.createElement("div");
    content.className = "my-location-marker";
    content.innerHTML = locationIndicatorHtml(heading);

    state.myLocationMarker = new window.kakao.maps.CustomOverlay({
      position: center,
      content,
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 50
    });
    state.myLocationMarker.setMap(map);

    state.myLocationCircle = new window.kakao.maps.Circle({
      center,
      radius: Math.max(40, Math.min(Number(accuracy || 120), 500)),
      strokeWeight: 1,
      strokeColor: "#2e68ff",
      strokeOpacity: 0.8,
      fillColor: "#2e68ff",
      fillOpacity: 0.12
    });
    state.myLocationCircle.setMap(map);
    return;
  }

  if (state.mapEngine === "LEAFLET" && window.L) {
    if (state.myLocationMarker) {
      state.myLocationMarker.remove();
    }
    if (state.myLocationCircle) {
      state.myLocationCircle.remove();
    }

    const icon = window.L.divIcon({
      className: "my-location-marker",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      html: locationIndicatorHtml(heading)
    });

    state.myLocationMarker = window.L.marker([lat, lng], { icon, zIndexOffset: 900 }).addTo(map);

    state.myLocationCircle = window.L.circle([lat, lng], {
      radius: Math.max(40, Math.min(Number(accuracy || 120), 500)),
      color: "#2e68ff",
      weight: 1,
      fillColor: "#2e68ff",
      fillOpacity: 0.12
    }).addTo(map);
  }
}

function startPositionWatch() {
  if (state.geoWatchId !== null) {
    return;
  }

  state.pendingLocateRefresh = true;
  state.geoWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      state.lastPosition = { lat: latitude, lng: longitude, accuracy };
      state.center = { lat: latitude, lng: longitude };
      setMyLocationIndicator(latitude, longitude, accuracy, state.currentHeading);

      if (state.locateMode !== "idle") {
        setMapView(latitude, longitude, 15);
      }

      if (state.pendingLocateRefresh) {
        state.pendingLocateRefresh = false;
        state.searchKeyword = "";
        await renderMarkers();
      }
    },
    () => {
      showStatus("위치 권한이 필요해요.", 2000);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

function stopPositionWatch() {
  if (state.geoWatchId !== null) {
    navigator.geolocation.clearWatch(state.geoWatchId);
    state.geoWatchId = null;
  }
}

function onDeviceOrientation(event) {
  let heading = null;
  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === "number") {
    heading = 360 - event.alpha;
  }

  if (heading === null || Number.isNaN(heading)) {
    return;
  }

  state.compassSignalReceived = true;
  state.currentHeading = heading;
  if (state.lastPosition) {
    setMyLocationIndicator(state.lastPosition.lat, state.lastPosition.lng, state.lastPosition.accuracy, heading);
  }
  applyMapRotation(heading);
}

function applyMapRotation(heading) {
  const mapEl = document.getElementById("map");
  if (!mapEl) {
    return;
  }

  if (heading === null) {
    mapEl.style.transform = "";
    if (elements.compassIndicator) {
      elements.compassIndicator.classList.add("hidden");
      elements.compassIndicator.style.transform = "";
    }
    return;
  }

  // Heading-up: rotate the map opposite to heading so "up" always matches facing direction.
  mapEl.style.transform = `rotate(${-heading}deg)`;
  if (elements.compassIndicator) {
    elements.compassIndicator.classList.remove("hidden");
    elements.compassIndicator.style.transform = `rotate(${-heading}deg)`;
  }
}

function setMapDraggable(enabled) {
  if (state.mapEngine === "KAKAO" && window.kakao?.maps && map?.setDraggable) {
    map.setDraggable(enabled);
    return;
  }
  if (state.mapEngine === "LEAFLET" && map?.dragging) {
    if (enabled) {
      map.dragging.enable();
    } else {
      map.dragging.disable();
    }
  }
}

function isSecureContextForSensors() {
  return Boolean(window.isSecureContext) || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

async function enableCompassMode() {
  if (typeof DeviceOrientationEvent === "undefined") {
    showStatus("이 기기/브라우저는 나침반 센서를 지원하지 않아요.", 2600);
    return false;
  }

  if (!isSecureContextForSensors()) {
    showStatus("나침반은 HTTPS 주소에서만 사용할 수 있어요.", 2800);
    return false;
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        showStatus("나침반 센서 권한이 거부되었어요.", 2200);
        return false;
      }
    }

    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    state.compassSignalReceived = false;
    window.addEventListener(eventName, onDeviceOrientation);
    state.compassEventName = eventName;
    setMapDraggable(false);

    setTimeout(() => {
      if (state.locateMode === "compass" && !state.compassSignalReceived) {
        showStatus("나침반 신호를 받지 못했어요. 기기를 좌우로 흔들어보세요.", 3000);
      }
    }, 2000);

    return true;
  } catch (error) {
    console.error("[enableCompassMode] 나침반 권한 오류:", error);
    showStatus("나침반 모드를 시작하지 못했어요.", 2200);
    return false;
  }
}

function disableCompassMode() {
  if (state.compassEventName) {
    window.removeEventListener(state.compassEventName, onDeviceOrientation);
    state.compassEventName = null;
  }
  state.currentHeading = null;
  state.compassSignalReceived = false;
  applyMapRotation(null);
  setMapDraggable(true);
  if (state.lastPosition) {
    setMyLocationIndicator(state.lastPosition.lat, state.lastPosition.lng, state.lastPosition.accuracy, null);
  }
}

const LOCATE_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.6M12 17.9v3.6M21.5 12h-3.6M6.1 12H2.5"/></svg>`;

const COMPASS_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M14.6 9.4 11 11l-1.6 3.6L13 13z" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></svg>`;

function updateLocateButtonUI() {
  if (!elements.locateBtn) {
    return;
  }
  const isCompass = state.locateMode === "compass";
  elements.locateBtn.innerHTML = isCompass ? COMPASS_ICON_SVG : LOCATE_ICON_SVG;
  elements.locateBtn.classList.toggle("compass-active", isCompass);
  elements.locateBtn.classList.toggle("locate-active", state.locateMode !== "idle");
}

function initLeafletMap() {
  if (!window.L) {
    showStatus("지도 라이브러리 로드에 실패했어요.", 2600);
    console.error("[initLeafletMap] Leaflet 라이브러리 로드 실패");
    return false;
  }

  console.log("[initLeafletMap] Leaflet 라이브러리 발견, 지도 초기화 시작");
  state.mapEngine = "LEAFLET";
  const mapContainer = document.getElementById("map");
  console.log("[initLeafletMap] 지도 컨테이너:", mapContainer);
  console.log("[initLeafletMap] 지도 컨테이너 크기:", mapContainer?.offsetWidth, "x", mapContainer?.offsetHeight);

  map = window.L.map("map", {
    zoomControl: false
  }).setView([state.center.lat, state.center.lng], 12);

  console.log("[initLeafletMap] Leaflet 맵 객체 생성됨:", map);

  leafletRoadLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  });

  leafletSatelliteLayer = window.L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    }
  );

  leafletRoadLayer.addTo(map);
  console.log("[initLeafletMap] OSM 타일 레이어 추가됨");

  // 지도 컨테이너 크기 강제 재계산 (2번 시도)
  setTimeout(() => {
    if (map && map.invalidateSize) {
      console.log("[initLeafletMap] 첫 번째 크기 재계산");
      map.invalidateSize(true);
    }
  }, 100);

  setTimeout(() => {
    if (map && map.invalidateSize) {
      console.log("[initLeafletMap] 두 번째 크기 재계산");
      map.invalidateSize(true);
    }
  }, 500);

  applyMapMode();

  map.on("click", () => {
    hideDetail();
  });

  showStatus("카카오 지도 연결 실패로 기본 지도로 전환했어요.", 2400);
  console.log("[initLeafletMap] Leaflet 지도 초기화 완료");
  return true;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function normalizeTypeLabel(type) {
  return type === "FREE" ? "100% 무료" : type === "CONDITIONAL" ? "조건부 무료" : "공영";
}

async function fetchSpots() {
  const query = new URLSearchParams({
    lat: String(state.center.lat),
    lng: String(state.center.lng),
    radius: "5000",
    type: state.type,
    limit: "100"
  });
  const data = await apiGet(`/api/parking/search?${query.toString()}`);
  return data.items.map((item) => ({ ...item, source: "LOCAL" }));
}

async function fetchUnifiedParking() {
  const query = new URLSearchParams({
    lat: String(state.center.lat),
    lng: String(state.center.lng),
    radius: "12000",
    limit: "300",
    type: state.type,
    query: state.searchKeyword || ""
  });

  const data = await apiGet(`/api/parking/unified-search?${query.toString()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  const counts = data.counts || {};

  state.sources.local = Number(counts.local || 0);
  state.sources.kakao = Number(counts.kakao || 0);
  state.sources.gongyu = Number(counts.gongyu || 0);
  state.sources.datago = Number(counts.datago || 0);

  return items;
}

async function fetchNationwideParking() {
  const keyword = state.searchKeyword || "공영주차장";
  const kakaoRows = state.kakao.restEnabled
    ? await Promise.all([
        searchKakaoViaServer(keyword, { size: 15, page: 1 }),
        searchKakaoViaServer(keyword, { size: 15, page: 2 }),
        searchKakaoViaServer(keyword, { size: 15, page: 3 })
      ])
    : [];

  const kakaoSpots = kakaoRows.flat().map((place) => {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    return {
      id: place.id,
      name: place.name,
      type: "PUBLIC",
      layer: "PARKING",
      lat,
      lng,
      distance_m: distanceMeters(state.center.lat, state.center.lng, lat, lng),
      operation_hours: "카카오 장소 정보",
      summary_fee_text: "요금 정보는 상세 확인 필요",
      summary_rule_text: null,
      has_evidence_image: false,
      source: "KAKAO",
      road_address_name: place.road_address_name,
      address_name: place.address_name,
      place_url: place.place_url,
      phone: place.phone || null
    };
  });

  const regionKeywords = [
    `서울 ${keyword}`,
    `부산 ${keyword}`,
    `대구 ${keyword}`,
    `인천 ${keyword}`,
    `광주 ${keyword}`,
    `대전 ${keyword}`,
    `울산 ${keyword}`,
    `세종 ${keyword}`,
    `수원 ${keyword}`,
    `춘천 ${keyword}`,
    `청주 ${keyword}`,
    `전주 ${keyword}`,
    `목포 ${keyword}`,
    `창원 ${keyword}`,
    `포항 ${keyword}`,
    `제주 ${keyword}`
  ];

  const osmRegionalRows = await Promise.allSettled(
    regionKeywords.map(async (queryWord) => {
      const params = new URLSearchParams({
        query: queryWord,
        limit: "12",
        countrycodes: "kr"
      });
      const data = await apiGet(`/api/osm/search?${params.toString()}`);
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const mapped = mapOsmRowsToSpots(Array.isArray(rows) ? rows : [], `osm_region_${queryWord}`);
      return mapped.slice(0, 6);
    })
  );

  const regionalGroups = osmRegionalRows
    .filter((item) => item.status === "fulfilled")
    .flatMap((item) => item.value);

  const interleavedRegional = [];
  const maxLen = regionalGroups.reduce((acc, list) => Math.max(acc, list.length), 0);
  for (let i = 0; i < maxLen; i += 1) {
    for (const list of regionalGroups) {
      if (list[i]) {
        interleavedRegional.push(list[i]);
      }
    }
  }

  const osmRows = await fetchOpenStreetParkingFallback();
  const merged = dedupeByLocation([...kakaoSpots, ...interleavedRegional, ...osmRows]);

  state.sources.local = 0;
  state.sources.kakao = kakaoSpots.length;
  state.sources.gongyu = 0;
  state.sources.datago = 0;

  return merged.slice(0, 120);
}

function loadKakaoSdk(key) {
  return new Promise((resolve, reject) => {
    if (!key) {
      resolve(false);
      return;
    }

    if (window.kakao?.maps?.services) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => resolve(true));
        } else {
          reject(new Error("KAKAO_SDK_GLOBAL_MISSING"));
        }
      });
      existing.addEventListener("error", () => reject(new Error("KAKAO_SDK_LOAD_FAILED")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    script.async = true;
    script.dataset.kakaoSdk = "true";
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("KAKAO_SDK_GLOBAL_MISSING"));
        return;
      }
      window.kakao.maps.load(() => resolve(true));
    };
    script.onerror = () => reject(new Error("KAKAO_SDK_LOAD_FAILED"));
    document.head.appendChild(script);

    setTimeout(() => {
      if (!window.kakao?.maps) {
        reject(new Error("KAKAO_SDK_LOAD_TIMEOUT"));
      }
    }, 6000);
  });
}

async function initKakaoPlacesService() {
  try {
    const config = await apiGet("/api/config/client");
    state.kakao.restEnabled = Boolean(config.kakao_rest_enabled);

    if (!config.kakao_enabled || !config.kakao_javascript_key) {
      showStatus("카카오 JavaScript 키가 없어 카카오 지도를 열 수 없어요.", 2200);
      return false;
    }

    await loadKakaoSdk(config.kakao_javascript_key);
    map = new window.kakao.maps.Map(document.getElementById("map"), {
      center: new window.kakao.maps.LatLng(state.center.lat, state.center.lng),
      level: toKakaoLevel(12)
    });
    state.mapEngine = "KAKAO";
    applyMapMode();

    window.kakao.maps.event.addListener(map, "click", () => {
      hideDetail();
    });

    state.kakao.enabled = true;
    state.kakao.javascriptKey = config.kakao_javascript_key;
    state.kakao.placesService = new window.kakao.maps.services.Places();
    showStatus(
      state.kakao.restEnabled
        ? "카카오 장소 검색(JS+REST)이 활성화되었습니다."
        : "카카오 장소 검색(JS)이 활성화되었습니다.",
      1800
    );
    return true;
  } catch (error) {
    const reason = String(error?.message || "");
    if (
      reason === "KAKAO_SDK_GLOBAL_MISSING" ||
      reason === "KAKAO_SDK_LOAD_FAILED" ||
      reason === "KAKAO_SDK_LOAD_TIMEOUT"
    ) {
      showStatus("카카오 지도 초기화 실패: 카카오 콘솔 웹 도메인(localhost:3000) 등록을 확인해주세요.", 3600);
    } else {
      showStatus("카카오 지도 초기화에 실패했어요. 키/도메인을 다시 확인해주세요.", 3000);
    }
    return false;
  }
}

async function searchKakaoViaServer(query, options = {}) {
  if (!state.kakao.restEnabled) {
    return [];
  }

  const params = new URLSearchParams({
    query: String(query || ""),
    radius: String(options.radius || 5000),
    page: String(options.page || 1),
    size: String(options.size || 15)
  });

  if (typeof options.x === "number" && typeof options.y === "number") {
    params.set("x", String(options.x));
    params.set("y", String(options.y));
  }

  try {
    const data = await apiGet(`/api/kakao/places/search?${params.toString()}`);
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    return [];
  }
}

async function searchKakaoCategories(category, options = {}) {
  if (!state.kakao.restEnabled) {
    return [];
  }

  const params = new URLSearchParams({
    category: String(category || ""),
    x: String(options.x),
    y: String(options.y),
    radius: String(options.radius || 3000),
    page: String(options.page || 1),
    size: String(options.size || 10)
  });

  try {
    const data = await apiGet(`/api/kakao/places/categories?${params.toString()}`);
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    return [];
  }
}

function searchKakaoKeyword(query, options = {}) {
  return new Promise((resolve, reject) => {
    if (!state.kakao.enabled || !state.kakao.placesService) {
      reject(new Error("kakao places unavailable"));
      return;
    }

    state.kakao.placesService.keywordSearch(query, (data, status) => {
      const okStatus = window.kakao.maps.services.Status.OK;
      const zeroStatus = window.kakao.maps.services.Status.ZERO_RESULT;

      if (status === okStatus) {
        resolve(data);
        return;
      }

      if (status === zeroStatus) {
        resolve([]);
        return;
      }

      reject(new Error("kakao search failed"));
    }, options);
  });
}

async function fetchKakaoNearbyPlaces() {
  if (state.type !== "ALL" && state.type !== "PUBLIC") {
    return [];
  }

  const keyword = state.searchKeyword && state.searchKeyword.trim().length >= 2
    ? state.searchKeyword.trim()
    : "주차장";

  const serverRowsSettled = await Promise.allSettled([
    searchKakaoViaServer(keyword, {
      x: state.center.lng,
      y: state.center.lat,
      radius: 12000,
      size: 15,
      page: 1
    }),
    searchKakaoViaServer(keyword, {
      x: state.center.lng,
      y: state.center.lat,
      radius: 12000,
      size: 15,
      page: 2
    }),
    searchKakaoViaServer("주차장", {
      x: state.center.lng,
      y: state.center.lat,
      radius: 12000,
      size: 15,
      page: 1
    })
  ]);

  const serverRows = serverRowsSettled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value);

  if (serverRows.length > 0) {
    return dedupeByLocation(serverRows.map((place) => {
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      return {
        id: place.id,
        name: place.name,
        type: "PUBLIC",
        layer: "PARKING",
        lat,
        lng,
        distance_m: Number(place.distance_m || distanceMeters(state.center.lat, state.center.lng, lat, lng)),
        operation_hours: "카카오 장소 정보",
        summary_fee_text: "요금 정보는 상세 확인 필요",
        summary_rule_text: null,
        has_evidence_image: false,
        source: "KAKAO",
        road_address_name: place.road_address_name,
        address_name: place.address_name,
        place_url: place.place_url,
        phone: place.phone || null
      };
    })).slice(0, 80);
  }

  if (!state.kakao.enabled || !state.kakao.placesService) {
    return [];
  }

  try {
    const location = new window.kakao.maps.LatLng(state.center.lat, state.center.lng);
    const places = await searchKakaoKeyword("주차장", {
      location,
      radius: 12000,
      size: 15,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    });

    return dedupeByLocation(places.map((place) => {
      const lat = Number(place.y);
      const lng = Number(place.x);
      return {
        id: `kakao_${place.id}`,
        name: place.place_name,
        type: "PUBLIC",
        layer: "PARKING",
        lat,
        lng,
        distance_m: distanceMeters(state.center.lat, state.center.lng, lat, lng),
        operation_hours: "카카오 장소 정보",
        summary_fee_text: "요금 정보는 상세 확인 필요",
        summary_rule_text: null,
        has_evidence_image: false,
        source: "KAKAO",
        road_address_name: place.road_address_name,
        address_name: place.address_name,
        place_url: place.place_url,
        phone: place.phone || null
      };
    })).slice(0, 60);
  } catch (error) {
    return [];
  }
}

async function fetchBuildingPlaces() {
  const rows = await searchKakaoViaServer("빌딩", {
    x: state.center.lng,
    y: state.center.lat,
    radius: 4000,
    size: 15
  });

  return rows.map((place) => {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    return {
      id: place.id,
      name: place.name,
      type: "PUBLIC",
      layer: "BUILDING",
      lat,
      lng,
      distance_m: Number(place.distance_m || distanceMeters(state.center.lat, state.center.lng, lat, lng)),
      source: "KAKAO",
      road_address_name: place.road_address_name,
      address_name: place.address_name,
      place_url: place.place_url,
      category_name: place.category_name,
      phone: place.phone || null
    };
  });
}

async function fetchGongyuPlaces() {
  try {
    const query = new URLSearchParams({
      lat: String(state.center.lat),
      lng: String(state.center.lng)
    });
    const data = await apiGet(`/api/gongyu/parking?${query.toString()}`);
    const list = Array.isArray(data.items) ? data.items : [];
    return list.map((spot) => ({
      ...spot,
      id: spot.id || `gongyu_${spot.lat}_${spot.lng}`,
      layer: "PARKING",
      source: "GONGYU",
      type: "PUBLIC"
    }));
  } catch (error) {
    return [];
  }
}

async function fetchDataGoPlaces() {
  try {
    const query = new URLSearchParams({
      lat: String(state.center.lat),
      lng: String(state.center.lng)
    });
    const data = await apiGet(`/api/data-go/parking?${query.toString()}`);
    const list = Array.isArray(data.items) ? data.items : [];
    return list.map((spot) => ({
      ...spot,
      id: spot.id || `datago_${spot.lat}_${spot.lng}`,
      layer: "PARKING",
      source: spot.source || "DATA_GO",
      type: "PUBLIC"
    }));
  } catch (error) {
    return [];
  }
}

async function fetchFacilityPlaces() {
  const categories = ["CS2", "FD6", "CE7", "SW8"];
  const results = await Promise.all(
    categories.map((category) =>
      searchKakaoCategories(category, {
        x: state.center.lng,
        y: state.center.lat,
        radius: 3000,
        size: 6
      })
    )
  );

  return results.flat().map((place) => {
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    return {
      id: place.id,
      name: place.name,
      type: "PUBLIC",
      layer: "FACILITY",
      lat,
      lng,
      distance_m: Number(place.distance_m || distanceMeters(state.center.lat, state.center.lng, lat, lng)),
      source: "KAKAO",
      road_address_name: place.road_address_name,
      address_name: place.address_name,
      place_url: place.place_url,
      category_name: place.category_name || place.category_group_name,
      phone: place.phone || null
    };
  });
}

async function fetchOpenStreetParkingFallback() {
  const lat = Number(state.center.lat);
  const lng = Number(state.center.lng);
  const delta = state.nationwide ? 2.8 : 0.12;
  const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
  const terms = ["주차장", "공영주차장", "parking lot", "public parking"];

  try {
    const settled = await Promise.allSettled(
      terms.map(async (term) => {
        const params = new URLSearchParams({
          query: term,
          limit: state.nationwide ? "60" : "40",
          bounded: "1",
          countrycodes: "kr",
          viewbox
        });
        const data = await apiGet(`/api/osm/search?${params.toString()}`);
        return Array.isArray(data.rows) ? data.rows : [];
      })
    );

    const rows = settled
      .filter((item) => item.status === "fulfilled")
      .flatMap((item) => item.value);

    const mapped = mapOsmRowsToSpots(rows, "osm");

    const deduped = dedupeByLocation(mapped);
    return deduped.slice(0, state.nationwide ? 180 : 60);
  } catch (error) {
    return [];
  }
}

function dedupeByLocation(spots) {
  const seen = new Set();
  return spots.filter((spot) => {
    const key = `${Math.round(spot.lat * 10000)}_${Math.round(spot.lng * 10000)}_${spot.name}_${spot.layer || "PARKING"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getPrimarySpotForActions() {
  if (state.selectedSpot && Number.isFinite(Number(state.selectedSpot.lat)) && Number.isFinite(Number(state.selectedSpot.lng))) {
    return {
      name: state.selectedSpot.name || "선택한 위치",
      lat: Number(state.selectedSpot.lat),
      lng: Number(state.selectedSpot.lng)
    };
  }

  const firstSpot = Array.isArray(state.lastRenderedSpots) ? state.lastRenderedSpots[0] : null;
  if (firstSpot && Number.isFinite(Number(firstSpot.lat)) && Number.isFinite(Number(firstSpot.lng))) {
    return {
      name: firstSpot.name || "주차장",
      lat: Number(firstSpot.lat),
      lng: Number(firstSpot.lng)
    };
  }

  return {
    name: state.searchKeyword || "현재 위치 주변 주차장",
    lat: Number(state.center.lat),
    lng: Number(state.center.lng)
  };
}

function buildKakaoMapLink(target) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(target.name)},${target.lat},${target.lng}`;
}

function loadKakaoShareSdk(key) {
  return new Promise((resolve, reject) => {
    if (!key) {
      reject(new Error("KAKAO_SHARE_KEY_MISSING"));
      return;
    }

    const initKakao = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(key);
        }
        resolve(true);
      } catch (error) {
        reject(error);
      }
    };

    if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-kakao-share-sdk="true"]');
    if (existing) {
      if (window.Kakao) {
        initKakao();
      } else {
        existing.addEventListener("load", initKakao);
        existing.addEventListener("error", () => reject(new Error("KAKAO_SHARE_SDK_LOAD_FAILED")));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    script.dataset.kakaoShareSdk = "true";
    script.onload = initKakao;
    script.onerror = () => reject(new Error("KAKAO_SHARE_SDK_LOAD_FAILED"));
    document.head.appendChild(script);
  });
}

async function shareKakaoTalkMessage() {
  const target = getPrimarySpotForActions();
  const mapUrl = buildKakaoMapLink(target);
  const shareText = `[꿀주차] ${target.name}\n카카오맵 길안내: ${mapUrl}`;

  try {
    if (state.kakao.javascriptKey) {
      await loadKakaoShareSdk(state.kakao.javascriptKey);
      if (window.Kakao?.Share) {
        window.Kakao.Share.sendDefault({
          objectType: "text",
          text: `[꿀주차] ${target.name}\n예상 요금과 위치를 확인해보세요.`,
          link: {
            mobileWebUrl: mapUrl,
            webUrl: mapUrl
          }
        });
        showStatus("카카오톡 공유 창을 열었어요.", 1500);
        return;
      }
    }
  } catch (error) {
    console.error("[shareKakaoTalkMessage] Kakao Share SDK 실패:", error);
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `꿀주차 - ${target.name}`,
        text: shareText,
        url: mapUrl
      });
      showStatus("공유 창을 열었어요. 카카오톡을 선택해 전송하세요.", 1700);
      return;
    } catch (error) {
      // user may cancel share; fallback to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    showStatus("공유 문구를 복사했어요. 카카오톡에 붙여넣어 전송하세요.", 2200);
  } catch (error) {
    window.prompt("아래 문구를 복사해서 카카오톡으로 보내세요.", shareText);
  }
}

function openKakaoMapByAction() {
  const target = getPrimarySpotForActions();
  const url = buildKakaoMapLink(target);
  window.open(url, "_blank", "noopener,noreferrer");
  showStatus("카카오맵 길안내를 열었어요.", 1300);
}

async function renderMarkers() {
  if (!map) {
    showStatus("지도 초기화 중입니다.", 1500);
    return;
  }

  hideEmptyState();

  const loadingMessage =
    state.nationwide
      ? "전국 주차 데이터를 불러오는 중..."
      :
    state.layer === "BUILDING"
      ? "건물 정보를 불러오는 중..."
      : state.layer === "FACILITY"
      ? "주변시설 정보를 불러오는 중..."
      : state.layer === "GONGYU"
      ? "공유누리 주차 정보를 불러오는 중..."
      : state.layer === "DATA_GO"
      ? "공공데이터 주차 정보를 불러오는 중..."
      : state.layer === "ALL"
      ? "통합 주차 정보를 불러오는 중..."
      : "주차장 정보를 불러오는 중...";
  showStatus(loadingMessage, 0);
  clearMarkers();
  hideDetail();
  hideMiniCard();

  try {
    let spots = [];
    let kakaoSpots = [];
    let localSpots = [];
    let gongyuSpots = [];
    let dataGoSpots = [];

    if (state.nationwide) {
      spots = await fetchNationwideParking();
      kakaoSpots = spots.filter((item) => item.source === "KAKAO");
      dataGoSpots = spots.filter((item) => String(item.source || "").startsWith("DATA_GO"));
      gongyuSpots = spots.filter((item) => item.source === "GONGYU");
    } else if (state.layer === "PARKING") {
      spots = await fetchUnifiedParking();
      localSpots = spots.filter((item) => item.source === "LOCAL");
      kakaoSpots = spots.filter((item) => item.source === "KAKAO");
      gongyuSpots = spots.filter((item) => item.source === "GONGYU");
      dataGoSpots = spots.filter((item) => String(item.source || "").startsWith("DATA_GO"));
    } else if (state.layer === "BUILDING") {
      const buildingSpots = await fetchBuildingPlaces();
      spots = dedupeByLocation(buildingSpots).sort((a, b) => a.distance_m - b.distance_m);
      kakaoSpots = buildingSpots;
    } else if (state.layer === "FACILITY") {
      const facilitySpots = await fetchFacilityPlaces();
      spots = dedupeByLocation(facilitySpots).sort((a, b) => a.distance_m - b.distance_m);
      kakaoSpots = facilitySpots;
    } else if (state.layer === "GONGYU") {
      gongyuSpots = await fetchGongyuPlaces();
      spots = dedupeByLocation(gongyuSpots).sort((a, b) => (a.distance_m || 999999) - (b.distance_m || 999999));
    } else if (state.layer === "DATA_GO") {
      dataGoSpots = await fetchDataGoPlaces();
      spots = dedupeByLocation(dataGoSpots).sort((a, b) => (a.distance_m || 999999) - (b.distance_m || 999999));
    } else {
      spots = await fetchUnifiedParking();
      localSpots = spots.filter((item) => item.source === "LOCAL");
      kakaoSpots = spots.filter((item) => item.source === "KAKAO");
      gongyuSpots = spots.filter((item) => item.source === "GONGYU");
      dataGoSpots = spots.filter((item) => String(item.source || "").startsWith("DATA_GO"));
    }

    if (state.layer !== "PARKING" && state.layer !== "ALL") {
      state.sources.local = localSpots.length;
      state.sources.kakao = kakaoSpots.length;
      state.sources.gongyu = gongyuSpots.length;
      state.sources.datago = dataGoSpots.length;
    }

    spots = applyClientFilters(spots).filter(
      (spot) => Number.isFinite(Number(spot?.lat)) && Number.isFinite(Number(spot?.lng))
    );
    state.lastRenderedSpots = spots;

    if (spots.length === 0) {
      if (state.layer === "PARKING" || state.layer === "ALL") {
        const fallbackKakao = await fetchKakaoNearbyPlaces();
        if (fallbackKakao.length > 0) {
          spots = dedupeByLocation(fallbackKakao).sort((a, b) => (a.distance_m || 999999) - (b.distance_m || 999999));
          state.sources.kakao = spots.length;
          state.sources.local = 0;
          state.sources.gongyu = 0;
          state.sources.datago = 0;
        } else {
          const fallbackOsm = await fetchOpenStreetParkingFallback();
          if (fallbackOsm.length > 0) {
            spots = dedupeByLocation(fallbackOsm).sort((a, b) => (a.distance_m || 999999) - (b.distance_m || 999999));
            state.sources.kakao = 0;
            state.sources.local = 0;
            state.sources.gongyu = 0;
            state.sources.datago = 0;
          }
        }
      }
    }

    if (spots.length === 0) {
      renderResultList([]);
      showEmptyState();
      showStatus("표시할 위치 정보가 없습니다. 검색어/현재 위치를 바꿔보세요.");
      return;
    }

    hideEmptyState();
    renderResultList(spots);

    spots.forEach((spot) => {
      const marker = createSpotMarker(spot, async () => {
        if (spot.source !== "LOCAL") {
          openExternalDetail(spot);
          return;
        }
        await openDetail(spot.id);
      });

      state.markers.push(marker);
    });

    if (state.nationwide) {
      showStatus(`${spots.length}개 전국 주차 데이터를 표시했어요.`);
    } else if (state.layer === "PARKING") {
      showStatus(
        `${spots.length}개 주차장 표시 (카카오 ${state.sources.kakao})`
      );
    } else if (state.layer === "BUILDING") {
      showStatus(`${spots.length}개 건물 정보를 표시했어요.`);
    } else if (state.layer === "GONGYU") {
      showStatus(`${spots.length}개 공유누리 자원정보를 표시했어요.`);
    } else if (state.layer === "DATA_GO") {
      showStatus(`${spots.length}개 공공데이터 주차정보를 표시했어요.`);
    } else if (state.layer === "ALL") {
      showStatus(`${spots.length}개 통합 데이터를 표시했어요.`);
    } else {
      showStatus(`${spots.length}개 주변시설 정보를 표시했어요.`);
    }
  } catch (error) {
    showEmptyState();
    showStatus("데이터를 불러오지 못했어요. 새로고침 해주세요.", 2000);
  }
}

function openExternalDetail(spot) {
  const estimated = estimateParkingFee(spot, state.stayMinutes);
  const compareTarget = Math.max(0, Number(state.destinationHourlyFee || 0)) * (state.stayMinutes / 60);
  const saved = Math.max(0, compareTarget - estimated.amount);

  state.selectedSpot = {
    name: spot.name,
    lat: spot.lat,
    lng: spot.lng,
    address: spotAddressText(spot),
    source: "KAKAO",
    url: spot.place_url,
    category_name: spot.category_name || "",
    id: spot.id
  };

  const sourceLabel =
    spot.source === "GONGYU"
      ? "공유누리"
      : String(spot.source || "").startsWith("DATA_GO")
      ? "공공데이터"
      : spot.source === "OSM"
      ? "오픈스트리트맵"
      : "카카오";

  elements.detailName.textContent = `${spot.name} (${sourceLabel})`;
  const distanceValue = Number(spot.distance_m || distanceMeters(state.center.lat, state.center.lng, spot.lat, spot.lng));
  elements.detailWalk.textContent = `도보 약 ${Math.max(1, Math.round(distanceValue / 70))}분 (${distanceValue}m)`;
  elements.savingTitle.textContent =
    spot.layer === "BUILDING"
      ? "건물 정보"
      : spot.layer === "FACILITY"
      ? "주변시설 정보"
      : sourceLabel === "공유누리"
      ? "공유누리 자원"
      : sourceLabel === "공공데이터"
      ? "공공데이터 정보"
        : "외부 장소 정보";
      elements.savingSub.textContent = saved > 0 ? `목적지 평균 대비 약 ${won(saved)} 절약 예상` : "절약은 적지만 접근성이 좋을 수 있어요.";
      elements.detailFee.textContent = `예상 ${Math.floor(state.stayMinutes / 60)}시간 ${won(estimated.amount)}`;
      elements.detailExtra.textContent = spot.phone ? `연락처 ${spot.phone}` : estimated.note;
  elements.detailAddress.textContent = spotAddressText(spot) || "주소 정보 없음";
  elements.detailHours.textContent = "운영시간 정보 없음";

  elements.miniName.textContent = spot.name;
  elements.miniType.textContent =
    spot.layer === "BUILDING"
      ? "건물(외부)"
      : spot.layer === "FACILITY"
      ? "시설(외부)"
      : sourceLabel === "공유누리"
      ? "공유누리(외부)"
      : sourceLabel === "공공데이터"
      ? "공공데이터(외부)"
      : "공영(외부)";

  elements.miniCard.classList.remove("hidden");
  resetDetailSheetPosition();
  elements.detailSheet.classList.remove("hidden");
  loadNearbyHotspots(spot.lat, spot.lng).catch(() => {
    renderNearbyList([]);
  });
  syncFavoriteButton();
  showStatus("선택한 위치 정보를 표시합니다.");
}

async function openDetail(id) {
  const query = new URLSearchParams({
    dest_lat: String(state.center.lat),
    dest_lng: String(state.center.lng),
    stay_minutes: String(state.stayMinutes),
    destination_hourly_fee: String(state.destinationHourlyFee)
  });

  const detail = await apiGet(`/api/parking/${id}?${query.toString()}`);
  state.selectedSpot = {
    ...detail,
    source: "LOCAL"
  };

  elements.detailName.textContent = detail.name;
  elements.detailWalk.textContent = `도보 ${detail.walk.eta_min}분 (${detail.walk.distance_m}m)`;
  elements.savingTitle.textContent = detail.cost_compare.label;
  elements.savingSub.textContent = detail.conditional_rule?.text || detail.fee_policy.text;
  elements.detailFee.textContent = detail.fee_policy.text || "정보 확인 중";
  elements.detailExtra.textContent = detail.fee_policy.extra_fee
    ? `${detail.fee_policy.fee_unit_min}분당 ${won(detail.fee_policy.extra_fee)}`
    : "추가 요금 없음";
  elements.detailAddress.textContent = detail.address || "정보 확인 중";
  elements.detailHours.textContent = detail.operation_hours || "정보 확인 중";

  elements.miniName.textContent = detail.name;
  elements.miniType.textContent = normalizeTypeLabel(detail.type);

  elements.miniCard.classList.remove("hidden");
  resetDetailSheetPosition();
  elements.detailSheet.classList.remove("hidden");
  loadNearbyHotspots(detail.lat, detail.lng).catch(() => {
    renderNearbyList([]);
  });
  syncFavoriteButton();
  showStatus("상세 정보를 업데이트했어요.");
}

async function geocode(query) {
  const serverRows = await searchKakaoViaServer(query, {
    x: state.center.lng,
    y: state.center.lat,
    radius: 20000,
    size: 1
  });

  if (serverRows.length > 0) {
    return {
      lat: Number(serverRows[0].lat),
      lng: Number(serverRows[0].lng)
    };
  }

  if (state.kakao.enabled) {
    try {
      const rows = await searchKakaoKeyword(query, { size: 1 });
      if (rows.length > 0) {
        return {
          lat: Number(rows[0].y),
          lng: Number(rows[0].x)
        };
      }
    } catch (error) {
      // fallback below
    }
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(endpoint);
  const data = await response.json();
  if (!data.length) {
    throw new Error("검색 결과가 없습니다.");
  }
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon)
  };
}

function switchTab(tab) {
  elements.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  if (tab === "report") {
    elements.reportPanel.classList.remove("hidden");
    hideDetail();
    hideMiniCard();
    const latInput = elements.reportForm.querySelector('input[name="lat"]');
    const lngInput = elements.reportForm.querySelector('input[name="lng"]');
    latInput.value = state.center.lat.toFixed(6);
    lngInput.value = state.center.lng.toFixed(6);
  } else {
    elements.reportPanel.classList.add("hidden");
    renderMarkers().catch(() => {
      showStatus("지도를 갱신하지 못했어요.", 1800);
    });
  }
}

elements.typeChips.forEach((chip) => {
  chip.addEventListener("click", async () => {
    elements.typeChips.forEach((node) => node.classList.remove("active"));
    chip.classList.add("active");
    state.type = chip.dataset.type;

    if (state.layer !== "PARKING") {
      state.layer = "PARKING";
      elements.layerChips.forEach((node) => {
        node.classList.toggle("active", node.dataset.layer === "PARKING");
      });
    }

    await renderMarkers();
  });
});

elements.layerChips.forEach((chip) => {
  chip.addEventListener("click", async () => {
    elements.layerChips.forEach((node) => node.classList.remove("active"));
    chip.classList.add("active");
    state.layer = chip.dataset.layer;
    await renderMarkers();
  });
});

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const value = elements.destinationInput.value.trim();
    if (!value) return;

    showStatus("목적지를 찾는 중...", 0);
    state.searchKeyword = value;

    if (!state.nationwide) {
      try {
        const point = await geocode(value);
        state.center = point;
        setMapView(point.lat, point.lng, 14);
      } catch (geoError) {
        showStatus("현재 지도 기준으로 키워드 검색을 진행합니다.", 1500);
      }
    }

    await renderMarkers();
  } catch (error) {
    showStatus(error.message, 1800);
  }
});

elements.popularKeywords.forEach((button) => {
  button.addEventListener("click", async () => {
    const keyword = String(button.dataset.keyword || "").trim();
    if (!keyword) return;
    elements.destinationInput.value = keyword;
    state.searchKeyword = keyword;
    showStatus(`"${keyword}" 검색 중...`, 1200);
    await renderMarkers();
  });
});

if (elements.nationwideToggle) {
  elements.nationwideToggle.addEventListener("change", async () => {
    state.nationwide = Boolean(elements.nationwideToggle.checked);
    if (state.nationwide) {
      state.center = { lat: 36.35, lng: 127.95 };
      setMapView(state.center.lat, state.center.lng, 7);
      showStatus("전국 보기 모드로 전환했어요.", 1300);
      state.layer = "PARKING";
      elements.layerChips.forEach((node) => {
        node.classList.toggle("active", node.dataset.layer === "PARKING");
      });
    } else {
      setMapView(state.center.lat, state.center.lng, 13);
      showStatus("근거리 보기 모드로 전환했어요.", 1300);
    }
    await renderMarkers();
  });
}

if (elements.realtimeToggle) {
  elements.realtimeToggle.addEventListener("change", () => {
    state.realtime = Boolean(elements.realtimeToggle.checked);
    updateRealtimeRefresh();
    showStatus(state.realtime ? "실시간 갱신을 켰어요." : "실시간 갱신을 껐어요.", 1100);
  });
}

if (elements.openKakaoMapBtn) {
  elements.openKakaoMapBtn.addEventListener("click", () => {
    openKakaoMapByAction();
  });
}

if (elements.shareKakaoTalkBtn) {
  elements.shareKakaoTalkBtn.addEventListener("click", async () => {
    await shareKakaoTalkMessage();
  });
}

if (elements.distanceFilter) {
  elements.distanceFilter.addEventListener("change", async () => {
    state.distanceFilter = elements.distanceFilter.value;
    await renderMarkers();
  });
}

if (elements.focusMapBtn) {
  elements.focusMapBtn.addEventListener("click", () => {
    hideDetail();
    hideMiniCard();
    showStatus("지도를 중심으로 보여드릴게요.", 1200);
  });
}

elements.locateBtn.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    showStatus("현재 브라우저에서 위치 기능을 사용할 수 없어요.", 2000);
    return;
  }

  if (state.locateMode === "idle") {
    state.locateMode = "locate";
    showStatus("현재 위치를 확인하는 중...", 1200);
    startPositionWatch();
  } else if (state.locateMode === "locate") {
    const enabled = await enableCompassMode();
    if (enabled) {
      state.locateMode = "compass";
      showStatus("나침반 모드로 전환했어요.", 1200);
    } else {
      showStatus("나침반 권한을 허용해주세요.", 2000);
    }
  } else {
    disableCompassMode();
    state.locateMode = "locate";
    showStatus("위치 조회 모드로 돌아왔어요.", 1200);
  }
  updateLocateButtonUI();
});

elements.refreshBtn.addEventListener("click", async () => {
  await renderMarkers();
});

if (elements.stayFilter) {
  elements.stayFilter.addEventListener("change", async () => {
    state.stayMinutes = Math.max(30, Number(elements.stayFilter.value || 120));
    await renderMarkers();
  });
}

if (elements.sortFilter) {
  elements.sortFilter.addEventListener("change", async () => {
    state.sortBy = elements.sortFilter.value || "DIST";
    await renderMarkers();
  });
}

if (elements.budgetApplyBtn && elements.budgetInput) {
  elements.budgetApplyBtn.addEventListener("click", async () => {
    state.destinationHourlyFee = Math.max(0, Number(elements.budgetInput.value || 0));
    showStatus("비교 기준 금액을 적용했어요.", 1200);
    await renderMarkers();
  });
}

if (elements.mapModeBtn) {
  elements.mapModeBtn.addEventListener("click", () => {
    toggleMapMode();
  });
}

elements.navItems.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    switchTab(tab);
  });
});

if (elements.showReportTab) {
  elements.showReportTab.addEventListener("click", () => {
    switchTab("report");
  });
}

if (elements.emptyAction) {
  elements.emptyAction.addEventListener("click", () => {
    renderMarkers().catch(() => {
      showStatus("다시 검색하지 못했어요.", 1600);
    });
  });
}

elements.reportTypeItems.forEach((item) => {
  const radio = item.querySelector('input[type="radio"]');
  item.addEventListener("click", () => {
    if (radio) {
      radio.checked = true;
    }
    elements.reportTypeItems.forEach((node) => node.classList.remove("active"));
    item.classList.add("active");
  });
});

if (elements.mapPickerBtn) {
  elements.mapPickerBtn.addEventListener("click", () => {
    const latInput = elements.reportForm.querySelector('input[name="lat"]');
    const lngInput = elements.reportForm.querySelector('input[name="lng"]');
    latInput.value = state.center.lat.toFixed(6);
    lngInput.value = state.center.lng.toFixed(6);
    showStatus("현재 지도 중심 좌표를 위치로 적용했어요.", 1800);
  });
}

if (elements.navStart) {
  elements.navStart.addEventListener("click", () => {
    if (!state.selectedSpot) {
      showStatus("먼저 주차장을 선택해주세요.", 1500);
      return;
    }

    const { lat, lng, name } = state.selectedSpot;
    const destinationName = encodeURIComponent(name || "주차장");
    
    // 카카오톡 길찾기 링크
    const kakaoTalkLink = `kakaotalk://route?dlat=${lat}&dlng=${lng}&dname=${destinationName}&appname=kkul.parking`;
    // 카카오맵 웹 길찾기 (카카오톡 없을 때 폴백)
    const kakaoWebLink = `https://map.kakao.com/link/to/${destinationName}/${lng},${lat}`;
    
    // 카카오톡 앱이 설치되어 있을 가능성을 고려해 카카오톡 링크를 먼저 시도
    window.location.href = kakaoTalkLink;
    
    // 카카오톡이 없으면 웹 버전으로 폴백 (2초 후)
    setTimeout(() => {
      window.open(kakaoWebLink, "_blank", "noopener,noreferrer");
    }, 1500);
    
    showStatus("카카오톡 길찾기를 열고 있어요.", 1200);
  });
}

if (elements.openPlaceLink) {
  elements.openPlaceLink.addEventListener("click", () => {
    if (!state.selectedSpot) {
      showStatus("먼저 주차장을 선택해주세요.", 1500);
      return;
    }

    const link = state.selectedSpot.url || `https://map.kakao.com/link/to/${encodeURIComponent(state.selectedSpot.name || "주차장")},${state.selectedSpot.lat},${state.selectedSpot.lng}`;
    window.open(link, "_blank", "noopener,noreferrer");
  });
}

const favoriteButton = document.querySelector(".fav-btn");
if (favoriteButton) {
  favoriteButton.addEventListener("click", async () => {
    if (!state.selectedSpot) {
      showStatus("먼저 주차장을 선택해주세요.", 1500);
      return;
    }
    const active = toggleFavoriteBySpot(state.selectedSpot);
    syncFavoriteButton();
    showStatus(active ? "즐겨찾기에 저장했어요." : "즐겨찾기에서 제거했어요.", 1200);
    await renderMarkers();
  });
}

function renderPhotoPreviews() {
  if (!elements.photoPreviewList) return;
  elements.photoPreviewList.innerHTML = "";
  state.reportPhotos.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "photo-preview-item";

    const img = document.createElement("img");
    img.className = "photo-preview-img";
    img.src = URL.createObjectURL(file);
    img.alt = `첨부 이미지 ${index + 1}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "photo-remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "사진 삭제";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.reportPhotos.splice(index, 1);
      renderPhotoPreviews();
    });

    item.appendChild(img);
    item.appendChild(removeBtn);
    elements.photoPreviewList.appendChild(item);
  });
}

if (elements.photoFileInput) {
  elements.photoFileInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const combined = [...state.reportPhotos, ...files].slice(0, 3);
    state.reportPhotos = combined;
    renderPhotoPreviews();
    event.target.value = "";
  });
}

if (elements.reportForm) {
elements.reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (elements.reportResult) {
    elements.reportResult.textContent = "";
  }

  const submitButton = elements.reportForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "제보 및 이미지 업로드 중...";
  }

  const formData = new FormData(elements.reportForm);
  let imageUrls = [];

  if (state.reportPhotos && state.reportPhotos.length > 0) {
    try {
      const uploadData = new FormData();
      state.reportPhotos.forEach((file) => uploadData.append("photos", file));
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadData
      });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok || !uploadPayload.success) {
        throw new Error(uploadPayload?.error?.message || "이미지 업로드에 실패했습니다.");
      }
      imageUrls = uploadPayload.data?.urls || [];
    } catch (uploadErr) {
      console.error("[Report Upload Error]", uploadErr);
      showStatus("사진 업로드에 실패했어요.", 2000);
      if (elements.reportResult) {
        elements.reportResult.textContent = `사진 업로드 실패: ${uploadErr.message}`;
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "제보하고 500P 받기";
      }
      return;
    }
  }

  const payload = {
    parking_name: String(formData.get("parking_name") || ""),
    type: String(formData.get("type") || "FREE"),
    lat: Number(formData.get("lat")),
    lng: Number(formData.get("lng")),
    rule_text: String(formData.get("rule_text") || ""),
    image_urls: imageUrls,
    memo: String(formData.get("memo") || "")
  };

  try {
    await apiPost("/api/reports", payload);
    elements.reportForm.reset();
    state.reportPhotos = [];
    renderPhotoPreviews();
    if (elements.reportResult) {
      elements.reportResult.textContent = "제보가 접수되었습니다. 검토 후 반영할게요.";
    }
    showStatus("제보 등록이 완료되었어요.", 1700);
  } catch (error) {
    showStatus("제보 등록에 실패했어요.", 1800);
    if (elements.reportResult) {
      elements.reportResult.textContent = "제보 등록에 실패했어요. 잠시 후 다시 시도해주세요.";
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "제보하고 500P 받기";
    }
  }
});
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideDetail();
    hideMiniCard();
  }
});

async function bootstrap() {
  loadFavorites();
  initPanelDragControl();
  initDetailSheetDragControl();
  if (elements.realtimeToggle) {
    elements.realtimeToggle.checked = true;
  }
  if (elements.sortFilter) {
    elements.sortFilter.value = "DIST";
  }
  if (elements.stayFilter) {
    elements.stayFilter.value = String(state.stayMinutes);
  }
  if (elements.budgetInput) {
    elements.budgetInput.value = String(state.destinationHourlyFee);
  }
  state.sourceFilter = "ALL";
  state.sortBy = "DIST";
  state.favoriteOnly = false;
  updateMapModeButton();
  updateRealtimeRefresh();
  showStatus("데이터 연결을 확인하는 중...", 900);
  await diagnoseSourceHealth();
  const ready = await initKakaoPlacesService();
  if (!ready) {
    const fallbackReady = initLeafletMap();
    if (!fallbackReady) {
      console.error("[bootstrap] Leaflet 초기화 실패");
      return;
    }
  } else {
    // Kakao 로드되면, Leaflet을 백업으로도 준비 (fallback용)
    const hasMap = document.getElementById("map");
    if (hasMap && !map) {
      console.log("[bootstrap] 카카오 지도 로드 후 Leaflet 백업 준비");
      initLeafletMap();
    }
  }
  
  // 지도 로드 후 최종 확인
  console.log("[bootstrap] 지도 로드 완료, map 객체:", map);
  console.log("[bootstrap] 지도 엔진:", state.mapEngine);
  
  await renderMarkers();
}

bootstrap().catch(() => {
  showStatus("지도 데이터를 불러오지 못했어요.", 2000);
});
