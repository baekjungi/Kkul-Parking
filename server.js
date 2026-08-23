require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DESTINATION_HOURLY_FEE = Number(process.env.DESTINATION_HOURLY_FEE || 7500);
const NODE_ENV = process.env.NODE_ENV || "development";
const KAKAO_JAVASCRIPT_KEY = process.env.KAKAO_JAVASCRIPT_KEY || "";
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || "";
const GONGYU_NURI_API_KEY = process.env.GONGYU_NURI_API_KEY || "";
const GONGYU_NURI_BASE_URL = process.env.GONGYU_NURI_BASE_URL || "";
const DATA_GO_ENDPOINTS = [
  {
    source: "AIRPORT_CONGESTION",
    key: process.env.DATA_GO_KR_AIRPORT_PARKING_CONGESTION_API_KEY || "",
    endpoint: process.env.DATA_GO_KR_AIRPORT_PARKING_CONGESTION_ENDPOINT || ""
  },
  {
    source: "POCHEON_PARKING",
    key: process.env.DATA_GO_KR_POCHEON_PARKING_INFO_API_KEY || "",
    endpoint: process.env.DATA_GO_KR_POCHEON_PARKING_INFO_ENDPOINT || ""
  },
  {
    source: "CHUNGJU_MARKET_PARKING",
    key: process.env.DATA_GO_KR_CHUNGJU_MARKET_PARKING_API_KEY || "",
    endpoint: process.env.DATA_GO_KR_CHUNGJU_MARKET_PARKING_ENDPOINT || ""
  },
  {
    source: "GWANGYANG_PARKING",
    key: process.env.DATA_GO_KR_GWANGYANG_PARKING_INFO_API_KEY || "",
    endpoint: process.env.DATA_GO_KR_GWANGYANG_PARKING_INFO_ENDPOINT || ""
  },
  {
    source: "DAEJEON_REALTIME_PARKING",
    key: process.env.DATA_GO_KR_DAEJEON_REALTIME_PARKING_API_KEY || "",
    endpoint: process.env.DATA_GO_KR_DAEJEON_REALTIME_PARKING_ENDPOINT || ""
  }
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const RATE_LIMIT_WINDOW_MS = Math.max(1000, Math.min(Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), 3600000));
const RATE_LIMIT_MAX = Math.max(20, Math.min(Number(process.env.RATE_LIMIT_MAX || 180), 3000));
const REPORT_RATE_LIMIT_MAX = Math.max(3, Math.min(Number(process.env.REPORT_RATE_LIMIT_MAX || 20), 200));

const spotsPath = path.join(__dirname, "data", "parking-spots.json");
const reportsPath = path.join(__dirname, "data", "reports.json");
const publicPath = path.join(__dirname, "public");

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Report-Only so violations are visible in the browser console before full enforcement.
// Verify no violations show up in production traffic, then flip reportOnly to false.
app.use(
  helmet({
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "https://dapi.kakao.com", "https://t1.kakaocdn.net", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https://dapi.kakao.com",
          "https://*.daumcdn.net",
          "https://*.kakaocdn.net"
        ],
        frameSrc: ["'self'", "https://map.kakao.com"]
      }
    },
    crossOriginResourcePolicy: false
  })
);

app.use(compression());

if (NODE_ENV !== "test") {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.length === 0) {
        // production without an explicit allow-list denies cross-origin browser requests by default
        return callback(null, NODE_ENV !== "production");
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy: origin not allowed"));
    }
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicPath, { maxAge: NODE_ENV === "production" ? "1d" : 0 }));

const rateLimitStore = new Map();

function cleanupRateLimitStore(now) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (!value || value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function checkAndConsumeRateLimit(key, max, now) {
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(key, next);
    return { allowed: true, remaining: Math.max(0, max - next.count), resetAt: next.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  if (current.count > max) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  return { allowed: true, remaining: Math.max(0, max - current.count), resetAt: current.resetAt };
}

function setRateLimitHeaders(res, max, result) {
  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isValidLatLng(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return false;
  }
  return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function sanitizeText(value, maxLength = 200) {
  const text = String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (!text) {
    return "";
  }
  return text.slice(0, maxLength);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

app.use("/api", (req, res, next) => {
  const now = Date.now();
  if (Math.random() < 0.01) {
    cleanupRateLimitStore(now);
  }

  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const isReportApi = req.method === "POST" && req.path === "/reports";
  const max = isReportApi ? REPORT_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const key = `${ip}:${isReportApi ? "reports" : "api"}`;
  const result = checkAndConsumeRateLimit(key, max, now);
  setRateLimitHeaders(res, max, result);

  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    const payload = fail("RATE_LIMITED", "too many requests", 429, [{ retry_after_sec: retryAfter }]);
    return res.status(payload.status).json(payload.body);
  }

  res.setHeader("Cache-Control", "no-store");
  return next();
});

function createMeta() {
  return {
    request_id: `req_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString()
  };
}

function ok(data, status = 200) {
  return {
    status,
    body: {
      success: true,
      data,
      meta: createMeta(),
      error: null
    }
  };
}

function fail(code, message, status = 400, details = []) {
  return {
    status,
    body: {
      success: false,
      data: null,
      meta: createMeta(),
      error: { code, message, details }
    }
  };
}

function readJson(filePath, fallback) {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function mapType(type) {
  const normalized = String(type || "ALL").toUpperCase();
  if (["ALL", "FREE", "CONDITIONAL", "PUBLIC"].includes(normalized)) {
    return normalized;
  }
  return "ALL";
}

function calculateAlternativeCost(spot, stayMinutes) {
  if (spot.type === "FREE") {
    return 0;
  }

  if (spot.type === "CONDITIONAL") {
    if ((spot.conditional_rule || "").includes("2시간 무료") && stayMinutes <= 120) {
      return 0;
    }
    if ((spot.conditional_rule || "").includes("3시간 무료") && stayMinutes <= 180) {
      return 0;
    }
    return Math.ceil(stayMinutes / (spot.fee_unit_min || 10)) * (spot.extra_fee || 0);
  }

  return Math.ceil(stayMinutes / (spot.fee_unit_min || 10)) * (spot.base_fee || 0);
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function parseXmlRows(xmlText) {
  if (!xmlText || typeof xmlText !== "string") {
    return [];
  }

  const rows = [];
  const blocks = xmlText.match(/<(item|row)>([\s\S]*?)<\/(item|row)>/gi) || [];

  for (const block of blocks) {
    const row = {};
    const regex = /<([a-zA-Z0-9_:-]+)>([\s\S]*?)<\/\1>/g;
    let match;
    while ((match = regex.exec(block)) !== null) {
      const key = String(match[1] || "").trim();
      const value = String(match[2] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      if (key) {
        row[key] = value;
      }
    }
    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

function parsePayloadByType(bodyText, contentType) {
  if (!bodyText) {
    return null;
  }

  const isJson = /application\/json|text\/json/i.test(contentType || "") || /^[\[{]/.test(bodyText.trim());
  if (isJson) {
    try {
      return JSON.parse(bodyText);
    } catch (error) {
      return null;
    }
  }

  return { rows: parseXmlRows(bodyText), raw: bodyText };
}

function flattenObjects(input, output = [], depth = 0) {
  if (depth > 6 || input == null) {
    return output;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      flattenObjects(item, output, depth + 1);
    }
    return output;
  }

  if (typeof input === "object") {
    const values = Object.values(input);
    const primitiveCount = values.filter((value) => value == null || typeof value !== "object").length;
    if (primitiveCount >= Math.max(2, Math.floor(values.length / 2))) {
      output.push(input);
    }

    for (const value of values) {
      flattenObjects(value, output, depth + 1);
    }
  }

  return output;
}

function findNumberByKeys(entry, keys) {
  for (const key of keys) {
    if (entry[key] == null) {
      continue;
    }
    const value = Number(String(entry[key]).replace(/,/g, "").trim());
    if (!Number.isNaN(value)) {
      return value;
    }
  }
  return null;
}

function findStringByKeys(entry, keys) {
  for (const key of keys) {
    const value = entry[key];
    if (value == null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function normalizeExternalRows(payload, sourceName, centerLat, centerLng) {
  const objects = flattenObjects(payload, []);
  const latKeys = ["lat", "latitude", "y", "mapy", "위도", "LAT", "Y", "gpslati", "la", "wgs84Lat"];
  const lngKeys = ["lng", "lon", "longitude", "x", "mapx", "경도", "LNG", "X", "gpslong", "lo", "wgs84Lon"];
  const nameKeys = [
    "name",
    "nm",
    "title",
    "place_name",
    "parking_name",
    "prkplceNm",
    "pkltNm",
    "주차장명",
    "시설명",
    "resourceNm"
  ];
  const addressKeys = ["address", "addr", "road_address_name", "lnmadr", "rdnmadr", "소재지", "resourceAddr"];

  return objects
    .map((entry, index) => {
      const lat = findNumberByKeys(entry, latKeys);
      const lng = findNumberByKeys(entry, lngKeys);
      if (lat == null || lng == null) {
        return null;
      }

      const name = findStringByKeys(entry, nameKeys) || `${sourceName} 장소 ${index + 1}`;
      const address = findStringByKeys(entry, addressKeys);
      const distance =
        typeof centerLat === "number" && typeof centerLng === "number" ? distanceMeters(centerLat, centerLng, lat, lng) : null;

      return {
        id: `${sourceName}_${index}_${Math.round(lat * 10000)}_${Math.round(lng * 10000)}`,
        name,
        type: "PUBLIC",
        layer: "PARKING",
        source: sourceName,
        lat,
        lng,
        distance_m: distance,
        address,
        raw: entry
      };
    })
    .filter(Boolean);
}

function safeUrl(base) {
  const text = String(base || "").trim();
  if (!text) {
    return "";
  }
  return text.endsWith("/") ? text.slice(0, -1) : text;
}

function buildDataGoKrUrl(endpoint, apiKey) {
  if (!endpoint) {
    return null;
  }

  const base = looksLikeUrl(endpoint) ? endpoint : `https://apis.data.go.kr${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const url = new URL(base);

  if (!url.searchParams.has("serviceKey") && !url.searchParams.has("ServiceKey")) {
    url.searchParams.set("serviceKey", apiKey);
  }

  if (!url.searchParams.has("_type")) {
    url.searchParams.set("_type", "json");
  }

  if (!url.searchParams.has("numOfRows")) {
    url.searchParams.set("numOfRows", "100");
  }

  return url.toString();
}

function textContainsKeyword(value, keyword) {
  if (!keyword) {
    return true;
  }
  return String(value || "").toLowerCase().includes(keyword.toLowerCase());
}

function dedupeParkingItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${Math.round(Number(item.lat || 0) * 10000)}_${Math.round(Number(item.lng || 0) * 10000)}_${String(item.name || "")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchKakaoParkingItems(centerLat, centerLng, radius = 5000) {
  if (!KAKAO_REST_API_KEY) {
    return [];
  }

  const keywords = ["주차장", "공영주차장", "유료주차장", "주차타워"];
  const pages = [1, 2, 3];
  const normalizedRadius = Math.max(100, Math.min(radius, 20000));

  const tasks = keywords.flatMap((queryText) =>
    pages.map(async (page) => {
      const params = new URLSearchParams({
        query: queryText,
        x: String(centerLng),
        y: String(centerLat),
        radius: String(normalizedRadius),
        page: String(page),
        size: "15",
        sort: "distance"
      });

      try {
        const response = await fetchWithTimeout(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
          method: "GET",
          headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` }
        }, 6000);

        if (!response.ok) {
          return [];
        }

        const payload = await response.json();
        const documents = Array.isArray(payload.documents) ? payload.documents : [];
        return documents.map((doc) => ({
          id: `kakao_${doc.id}`,
          name: doc.place_name,
          type: "PUBLIC",
          source: "KAKAO",
          layer: "PARKING",
          lat: Number(doc.y),
          lng: Number(doc.x),
          distance_m: doc.distance ? Number(doc.distance) : distanceMeters(centerLat, centerLng, Number(doc.y), Number(doc.x)),
          address: doc.road_address_name || doc.address_name || "",
          category_name: doc.category_name || "",
          place_url: doc.place_url || null,
          phone: doc.phone || null
        }));
      } catch (error) {
        return [];
      }
    })
  );

  const settled = await Promise.allSettled(tasks);
  const merged = settled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value);

  return dedupeParkingItems(merged).slice(0, 220);
}

async function fetchGongyuParkingItems(centerLat, centerLng) {
  if (!GONGYU_NURI_API_KEY || !GONGYU_NURI_BASE_URL) {
    return [];
  }

  const endpoint = `${safeUrl(GONGYU_NURI_BASE_URL)}/eshare-openapi/rsrc/list/010700/${encodeURIComponent(GONGYU_NURI_API_KEY)}`;

  try {
    const response = await fetchWithTimeout(endpoint, { method: "GET" }, 7000);
    if (!response.ok) {
      return [];
    }
    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const payload = parsePayloadByType(bodyText, contentType);
    return normalizeExternalRows(payload, "GONGYU", centerLat, centerLng);
  } catch (error) {
    return [];
  }
}

async function fetchDataGoParkingItems(centerLat, centerLng) {
  const targets = DATA_GO_ENDPOINTS.filter((entry) => entry.key && entry.endpoint);
  if (targets.length === 0) {
    return [];
  }

  const tasks = targets.map(async (entry) => {
    const url = buildDataGoKrUrl(entry.endpoint, entry.key);
    if (!url) {
      return [];
    }

    try {
      const response = await fetchWithTimeout(url, { method: "GET" }, 7000);
      if (!response.ok) {
        return [];
      }

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();
      const payload = parsePayloadByType(bodyText, contentType);
      return normalizeExternalRows(payload, `DATA_GO_${entry.source}`, centerLat, centerLng);
    } catch (error) {
      return [];
    }
  });

  const result = await Promise.all(tasks);
  return result.flat();
}

app.get("/api/health", (req, res) => {
  const dataGoConfiguredCount = DATA_GO_ENDPOINTS.filter((entry) => entry.key && entry.endpoint).length;
  const { status, body } = ok({
    service: "kkul-parking-api",
    status: "ok",
    env: NODE_ENV,
    uptime_sec: Math.round(process.uptime()),
    node_version: process.version,
    now: new Date().toISOString(),
    kakao_enabled: Boolean(KAKAO_JAVASCRIPT_KEY),
    kakao_rest_enabled: Boolean(KAKAO_REST_API_KEY),
    gongyu_enabled: Boolean(GONGYU_NURI_API_KEY && GONGYU_NURI_BASE_URL),
    data_go_configured_count: dataGoConfiguredCount
  });
  res.status(status).json(body);
});

app.get("/api/config/client", (req, res) => {
  const { status, body } = ok({
    kakao_javascript_key: KAKAO_JAVASCRIPT_KEY || null,
    kakao_enabled: Boolean(KAKAO_JAVASCRIPT_KEY),
    kakao_rest_enabled: Boolean(KAKAO_REST_API_KEY),
    gongyu_enabled: Boolean(GONGYU_NURI_API_KEY && GONGYU_NURI_BASE_URL),
    data_go_enabled: DATA_GO_ENDPOINTS.some((entry) => entry.key && entry.endpoint)
  });
  res.status(status).json(body);
});

app.get("/api/gongyu/parking", async (req, res) => {
  if (!GONGYU_NURI_API_KEY || !GONGYU_NURI_BASE_URL) {
    const result = fail("GONGYU_NOT_CONFIGURED", "Gongyu Nuri env values are missing", 503);
    return res.status(result.status).json(result.body);
  }

  const centerLat = Number(req.query.lat);
  const centerLng = Number(req.query.lng);
  if (!isValidLatLng(centerLat, centerLng)) {
    const result = fail("INVALID_QUERY", "lat and lng are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }
  const endpoint = `${safeUrl(GONGYU_NURI_BASE_URL)}/eshare-openapi/rsrc/list/010700/${encodeURIComponent(GONGYU_NURI_API_KEY)}`;

  try {
    const response = await fetchWithTimeout(endpoint, { method: "GET" }, 7000);
    if (!response.ok) {
      const result = fail("GONGYU_API_ERROR", `gongyu request failed: ${response.status}`, 502);
      return res.status(result.status).json(result.body);
    }

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const payload = parsePayloadByType(bodyText, contentType);
    const items = normalizeExternalRows(payload, "GONGYU", centerLat, centerLng);

    const result = ok({
      source: "GONGYU",
      endpoint,
      total: items.length,
      items
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    const result = fail("GONGYU_API_ERROR", isAbort ? "gongyu api timeout" : "gongyu api request failed", isAbort ? 504 : 502);
    return res.status(result.status).json(result.body);
  }
});

app.get("/api/data-go/parking", async (req, res) => {
  const centerLat = Number(req.query.lat);
  const centerLng = Number(req.query.lng);
  if (!isValidLatLng(centerLat, centerLng)) {
    const result = fail("INVALID_QUERY", "lat and lng are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  const targets = DATA_GO_ENDPOINTS.filter((entry) => entry.key && entry.endpoint);
  if (targets.length === 0) {
    const result = fail("DATA_GO_NOT_CONFIGURED", "No Data.go.kr endpoint+key pair configured", 503);
    return res.status(result.status).json(result.body);
  }

  const tasks = targets.map(async (entry) => {
    const url = buildDataGoKrUrl(entry.endpoint, entry.key);
    if (!url) {
      return {
        source: entry.source,
        ok: false,
        endpoint: entry.endpoint,
        total: 0,
        items: [],
        error: "invalid endpoint"
      };
    }

    try {
      const response = await fetchWithTimeout(url, { method: "GET" }, 7000);
      if (!response.ok) {
        return {
          source: entry.source,
          ok: false,
          endpoint: url,
          total: 0,
          items: [],
          error: `request failed: ${response.status}`
        };
      }

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();
      const payload = parsePayloadByType(bodyText, contentType);
      const items = normalizeExternalRows(payload, `DATA_GO_${entry.source}`, centerLat, centerLng);

      return {
        source: entry.source,
        ok: true,
        endpoint: url,
        total: items.length,
        items,
        error: null
      };
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      return {
        source: entry.source,
        ok: false,
        endpoint: url,
        total: 0,
        items: [],
        error: isAbort ? "timeout" : "request failed"
      };
    }
  });

  const results = await Promise.all(tasks);
  const mergedItems = results.flatMap((entry) => entry.items || []);
  const result = ok({
    sources: results.map((entry) => ({
      source: entry.source,
      ok: entry.ok,
      total: entry.total,
      error: entry.error
    })),
    total: mergedItems.length,
    items: mergedItems
  });
  return res.status(result.status).json(result.body);
});

app.get("/api/parking/unified-search", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.max(300, Math.min(Number(req.query.radius || 5000), 20000));
  const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 300));
  const type = mapType(req.query.type);
  const query = String(req.query.query || "").trim();

  if (!isValidLatLng(lat, lng)) {
    const result = fail("INVALID_QUERY", "lat and lng are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  if (query.length > 100) {
    const result = fail("INVALID_QUERY", "query must be 100 characters or less", 400);
    return res.status(result.status).json(result.body);
  }

  const localSpots = readJson(spotsPath, [])
    .filter((spot) => spot.status === "ACTIVE")
    .map((spot) => ({
      id: spot.id,
      name: spot.name,
      type: spot.type,
      source: "LOCAL",
      layer: "PARKING",
      lat: spot.lat,
      lng: spot.lng,
      address: spot.address || "",
      distance_m: distanceMeters(lat, lng, spot.lat, spot.lng),
      operation_hours: spot.operation_hours,
      summary_fee_text: spot.summary_fee_text,
      summary_rule_text: spot.conditional_rule,
      has_evidence_image: Array.isArray(spot.evidence_images) && spot.evidence_images.length > 0
    }))
    .filter((spot) => spot.distance_m <= radius)
    .filter((spot) => (type === "ALL" ? true : spot.type === type));

  const [kakaoSpots, gongyuSpots, dataGoSpots] = await Promise.all([
    fetchKakaoParkingItems(lat, lng, radius),
    fetchGongyuParkingItems(lat, lng),
    fetchDataGoParkingItems(lat, lng)
  ]);

  const filteredKakao = kakaoSpots.filter((spot) => (type === "ALL" || type === "PUBLIC" ? true : false));
  const filteredGongyu = gongyuSpots.filter((spot) => (type === "ALL" || type === "PUBLIC" ? true : false));
  const filteredDataGo = dataGoSpots.filter((spot) => (type === "ALL" || type === "PUBLIC" ? true : false));

  const merged = dedupeParkingItems([...localSpots, ...filteredKakao, ...filteredGongyu, ...filteredDataGo])
    .filter((spot) => (spot.distance_m == null ? true : spot.distance_m <= radius))
    .filter((spot) => {
      if (!query) {
        return true;
      }
      return (
        textContainsKeyword(spot.name, query) ||
        textContainsKeyword(spot.address, query) ||
        textContainsKeyword(spot.category_name, query) ||
        textContainsKeyword(spot.source, query)
      );
    })
    .sort((a, b) => (a.distance_m || 999999) - (b.distance_m || 999999))
    .slice(0, limit);

  const result = ok({
    query,
    center: { lat, lng },
    radius,
    total: merged.length,
    counts: {
      local: localSpots.length,
      kakao: filteredKakao.length,
      gongyu: filteredGongyu.length,
      datago: filteredDataGo.length
    },
    items: merged
  });

  return res.status(result.status).json(result.body);
});

app.get("/api/kakao/places/search", async (req, res) => {
  if (!KAKAO_REST_API_KEY) {
    const result = fail("KAKAO_NOT_CONFIGURED", "KAKAO_REST_API_KEY is not configured", 503);
    return res.status(result.status).json(result.body);
  }

  const query = String(req.query.query || "").trim();
  const x = req.query.x ? Number(req.query.x) : null;
  const y = req.query.y ? Number(req.query.y) : null;
  const radius = Math.max(100, Math.min(Number(req.query.radius || 5000), 20000));
  const page = Math.max(1, Math.min(Number(req.query.page || 1), 45));
  const size = Math.max(1, Math.min(Number(req.query.size || 15), 15));

  if (!query) {
    const result = fail("INVALID_QUERY", "query is required", 400);
    return res.status(result.status).json(result.body);
  }

  if (query.length > 100) {
    const result = fail("INVALID_QUERY", "query must be 100 characters or less", 400);
    return res.status(result.status).json(result.body);
  }

  if ((req.query.x != null || req.query.y != null) && !isValidLatLng(y, x)) {
    const result = fail("INVALID_QUERY", "x and y must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  const params = new URLSearchParams({ query, radius: String(radius), page: String(page), size: String(size) });
  if (!Number.isNaN(Number(x)) && !Number.isNaN(Number(y))) {
    params.set("x", String(x));
    params.set("y", String(y));
    params.set("sort", "distance");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const result = fail("KAKAO_API_ERROR", `kakao api request failed: ${response.status}`, 502);
      return res.status(result.status).json(result.body);
    }

    const payload = await response.json();
    const documents = Array.isArray(payload.documents) ? payload.documents : [];

    const items = documents.map((doc) => ({
      id: `kakao_${doc.id}`,
      provider_id: doc.id,
      name: doc.place_name,
      category_name: doc.category_name,
      phone: doc.phone || null,
      place_url: doc.place_url,
      road_address_name: doc.road_address_name || null,
      address_name: doc.address_name || null,
      lat: Number(doc.y),
      lng: Number(doc.x),
      distance_m: doc.distance ? Number(doc.distance) : null
    }));

    const result = ok({
      items,
      total_count: Number(payload?.meta?.total_count || 0),
      is_end: Boolean(payload?.meta?.is_end)
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.name === "AbortError") {
      const result = fail("KAKAO_TIMEOUT", "kakao api timeout", 504);
      return res.status(result.status).json(result.body);
    }

    const result = fail("KAKAO_API_ERROR", "failed to fetch kakao places", 502);
    return res.status(result.status).json(result.body);
  } finally {
    clearTimeout(timeoutId);
  }
});

app.get("/api/kakao/places/categories", async (req, res) => {
  if (!KAKAO_REST_API_KEY) {
    const result = fail("KAKAO_NOT_CONFIGURED", "KAKAO_REST_API_KEY is not configured", 503);
    return res.status(result.status).json(result.body);
  }

  const category = String(req.query.category || "").trim().toUpperCase();
  const x = Number(req.query.x);
  const y = Number(req.query.y);
  const radius = Math.max(100, Math.min(Number(req.query.radius || 2000), 20000));
  const page = Math.max(1, Math.min(Number(req.query.page || 1), 45));
  const size = Math.max(1, Math.min(Number(req.query.size || 15), 15));

  const allowedCategories = new Set(["CE7", "FD6", "CS2", "SW8", "OL7", "PK6", "AT4", "BK9"]);
  if (!allowedCategories.has(category)) {
    const result = fail("INVALID_QUERY", "category must be one of CE7, FD6, CS2, SW8, OL7, PK6, AT4, BK9", 400);
    return res.status(result.status).json(result.body);
  }

  if (!isValidLatLng(y, x)) {
    const result = fail("INVALID_QUERY", "x and y are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  const params = new URLSearchParams({
    category_group_code: category,
    x: String(x),
    y: String(y),
    radius: String(radius),
    page: String(page),
    size: String(size),
    sort: "distance"
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const result = fail("KAKAO_API_ERROR", `kakao category request failed: ${response.status}`, 502);
      return res.status(result.status).json(result.body);
    }

    const payload = await response.json();
    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    const items = documents.map((doc) => ({
      id: `kakao_${doc.id}`,
      provider_id: doc.id,
      name: doc.place_name,
      category_group_code: doc.category_group_code,
      category_group_name: doc.category_group_name,
      category_name: doc.category_name,
      phone: doc.phone || null,
      place_url: doc.place_url,
      road_address_name: doc.road_address_name || null,
      address_name: doc.address_name || null,
      lat: Number(doc.y),
      lng: Number(doc.x),
      distance_m: doc.distance ? Number(doc.distance) : null
    }));

    const result = ok({
      items,
      total_count: Number(payload?.meta?.total_count || 0),
      is_end: Boolean(payload?.meta?.is_end)
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.name === "AbortError") {
      const result = fail("KAKAO_TIMEOUT", "kakao api timeout", 504);
      return res.status(result.status).json(result.body);
    }

    const result = fail("KAKAO_API_ERROR", "failed to fetch kakao categories", 502);
    return res.status(result.status).json(result.body);
  } finally {
    clearTimeout(timeoutId);
  }
});

app.get("/api/osm/search", async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) {
    const result = fail("MISSING_QUERY", "query is required", 400);
    return res.status(result.status).json(result.body);
  }

  if (query.length > 100) {
    const result = fail("INVALID_QUERY", "query must be 100 characters or less", 400);
    return res.status(result.status).json(result.body);
  }

  const limit = Math.min(80, Math.max(1, Number(req.query.limit || 20)));
  const countrycodes = String(req.query.countrycodes || "kr").trim();
  const viewbox = String(req.query.viewbox || "").trim();
  const bounded = String(req.query.bounded || "0") === "1";

  try {
    const params = new URLSearchParams({
      format: "json",
      addressdetails: "1",
      limit: String(limit),
      q: query,
      countrycodes
    });

    if (viewbox) {
      params.set("viewbox", viewbox);
    }
    if (bounded) {
      params.set("bounded", "1");
    }

    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "kkul-parking-local/1.0"
      }
    }, 7000);

    if (!response.ok) {
      const result = fail("OSM_API_ERROR", `osm request failed: ${response.status}`, 502);
      return res.status(result.status).json(result.body);
    }

    const rows = await response.json();
    const data = ok({
      query,
      count: Array.isArray(rows) ? rows.length : 0,
      rows: Array.isArray(rows) ? rows : []
    });
    return res.status(data.status).json(data.body);
  } catch (error) {
    const isAbort = error && error.name === "AbortError";
    const result = fail("OSM_API_ERROR", isAbort ? "osm api timeout" : "osm api request failed", isAbort ? 504 : 502);
    return res.status(result.status).json(result.body);
  }
});

app.get("/api/parking/search", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.max(100, Math.min(Number(req.query.radius || 1500), 5000));
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 200));
  const type = mapType(req.query.type);

  if (!isValidLatLng(lat, lng)) {
    const result = fail("INVALID_QUERY", "lat and lng are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  const spots = readJson(spotsPath, []);

  const items = spots
    .filter((spot) => spot.status === "ACTIVE")
    .map((spot) => {
      const distance = distanceMeters(lat, lng, spot.lat, spot.lng);
      return {
        ...spot,
        distance_m: distance
      };
    })
    .filter((spot) => spot.distance_m <= radius)
    .filter((spot) => (type === "ALL" ? true : spot.type === type))
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, limit)
    .map((spot) => ({
      id: spot.id,
      name: spot.name,
      type: spot.type,
      lat: spot.lat,
      lng: spot.lng,
      distance_m: spot.distance_m,
      operation_hours: spot.operation_hours,
      summary_fee_text: spot.summary_fee_text,
      summary_rule_text: spot.conditional_rule,
      has_evidence_image: Array.isArray(spot.evidence_images) && spot.evidence_images.length > 0
    }));

  const result = ok({ items, next_cursor: null });
  return res.status(result.status).json(result.body);
});

app.get("/api/parking/:id", (req, res) => {
  const { id } = req.params;
  const destLat = Number(req.query.dest_lat);
  const destLng = Number(req.query.dest_lng);
  const stayMinutes = Math.max(30, Math.min(Number(req.query.stay_minutes || 120), 720));
  const destinationHourlyFee = Number(req.query.destination_hourly_fee || DESTINATION_HOURLY_FEE);

  if (!isValidLatLng(destLat, destLng)) {
    const result = fail("INVALID_QUERY", "dest_lat and dest_lng are required and must be valid coordinates", 400);
    return res.status(result.status).json(result.body);
  }

  const spots = readJson(spotsPath, []);
  const spot = spots.find((entry) => entry.id === id && entry.status === "ACTIVE");

  if (!spot) {
    const result = fail("PARKING_NOT_FOUND", "parking spot not found", 404);
    return res.status(result.status).json(result.body);
  }

  const distance = distanceMeters(destLat, destLng, spot.lat, spot.lng);
  const etaMin = Math.max(1, Math.round(distance / 70));
  const destinationCost = Math.round((destinationHourlyFee / 60) * stayMinutes);
  const alternativeCost = calculateAlternativeCost(spot, stayMinutes);
  const savingAmount = destinationCost - alternativeCost;
  const savingPercent = destinationCost > 0 ? Math.max(0, Math.round((savingAmount / destinationCost) * 100)) : 0;

  const result = ok({
    id: spot.id,
    name: spot.name,
    type: spot.type,
    lat: spot.lat,
    lng: spot.lng,
    address: spot.address,
    operation_hours: spot.operation_hours,
    contact: spot.contact || null,
    fee_policy: {
      base_fee: spot.base_fee,
      fee_unit_min: spot.fee_unit_min,
      extra_fee: spot.extra_fee,
      text: spot.summary_fee_text
    },
    conditional_rule: spot.conditional_rule
      ? {
          minimum_purchase: spot.conditional_rule.includes("1만원")
            ? 10000
            : spot.conditional_rule.includes("2만원")
            ? 20000
            : null,
          free_minutes: spot.conditional_rule.includes("3시간")
            ? 180
            : spot.conditional_rule.includes("2시간")
            ? 120
            : null,
          text: spot.conditional_rule
        }
      : null,
    walk: {
      distance_m: distance,
      eta_min: etaMin
    },
    evidence_images: spot.evidence_images || [],
    cost_compare: {
      destination_cost: destinationCost,
      alternative_cost: alternativeCost,
      saving_amount: savingAmount,
      saving_percent: savingPercent,
      label: savingAmount > 0 ? `약 ${savingAmount.toLocaleString("ko-KR")}원 절약` : "절약 없음"
    },
    updated_at: spot.updated_at
  });

  return res.status(result.status).json(result.body);
});

app.post("/api/reports", (req, res) => {
  const {
    parking_name,
    type,
    lat,
    lng,
    address,
    rule_text,
    operation_hours,
    image_urls,
    memo,
    reporter_nickname
  } = req.body || {};

  const safeParkingName = sanitizeText(parking_name, 100);
  const safeRuleText = sanitizeText(rule_text, 500);
  const safeAddress = sanitizeText(address, 200);
  const safeOperationHours = sanitizeText(operation_hours, 80);
  const safeMemo = sanitizeText(memo, 1000);
  const safeReporter = sanitizeText(reporter_nickname, 30) || "anonymous";
  const safeImageUrls = Array.isArray(image_urls)
    ? image_urls
        .map((url) => sanitizeText(url, 500))
        .filter((url) => Boolean(url))
    : [];

  if (!safeParkingName || safeParkingName.length < 2 || safeParkingName.length > 100) {
    const result = fail("INVALID_BODY", "parking_name length must be 2~100", 400);
    return res.status(result.status).json(result.body);
  }

  if (!["FREE", "CONDITIONAL", "PUBLIC"].includes(type)) {
    const result = fail("INVALID_BODY", "type must be FREE, CONDITIONAL, PUBLIC", 400);
    return res.status(result.status).json(result.body);
  }

  if (!isValidLatLng(lat, lng)) {
    const result = fail("INVALID_BODY", "lat and lng are required", 400);
    return res.status(result.status).json(result.body);
  }

  if (!safeRuleText || safeRuleText.length < 5 || safeRuleText.length > 500) {
    const result = fail("INVALID_BODY", "rule_text length must be 5~500", 400);
    return res.status(result.status).json(result.body);
  }

  if (safeImageUrls.length < 1 || safeImageUrls.length > 3) {
    const result = fail("IMAGE_LIMIT_EXCEEDED", "image_urls must be 1~3 items", 400);
    return res.status(result.status).json(result.body);
  }

  if (safeImageUrls.some((url) => !isValidHttpUrl(url))) {
    const result = fail("INVALID_BODY", "image_urls must be valid http/https URLs", 400);
    return res.status(result.status).json(result.body);
  }

  const reports = readJson(reportsPath, []);

  const isDuplicate = reports.some(
    (report) =>
      report.parking_name === safeParkingName &&
      Math.abs(report.lat - Number(lat)) < 0.0001 &&
      Math.abs(report.lng - Number(lng)) < 0.0001 &&
      report.review_status === "PENDING"
  );

  if (isDuplicate) {
    const result = fail("DUPLICATE_REPORT", "pending duplicate report exists", 422);
    return res.status(result.status).json(result.body);
  }

  const newReport = {
    id: `rp_${Date.now()}`,
    parking_name: safeParkingName,
    report_type: type,
    lat: Number(lat),
    lng: Number(lng),
    address: safeAddress,
    rule_text: safeRuleText,
    operation_hours: safeOperationHours,
    image_urls: safeImageUrls,
    memo: safeMemo,
    reporter_nickname: safeReporter,
    review_status: "PENDING",
    reject_reason: null,
    created_at: new Date().toISOString()
  };

  reports.push(newReport);
  writeJson(reportsPath, reports);

  const result = ok(
    {
      report_id: newReport.id,
      review_status: newReport.review_status,
      created_at: newReport.created_at
    },
    201
  );

  return res.status(result.status).json(result.body);
});

app.get("/api/reports/:id", (req, res) => {
  const reports = readJson(reportsPath, []);
  const target = reports.find((report) => report.id === req.params.id);

  if (!target) {
    const result = fail("REPORT_NOT_FOUND", "report not found", 404);
    return res.status(result.status).json(result.body);
  }

  const result = ok({
    report_id: target.id,
    review_status: target.review_status,
    reject_reason: target.reject_reason,
    created_at: target.created_at
  });

  return res.status(result.status).json(result.body);
});

app.get("/api/meta/popular-destinations", (req, res) => {
  const result = ok({
    items: [
      "성수동 카페거리",
      "홍대 걷고싶은거리",
      "강남역",
      "광화문",
      "여의도 한강공원"
    ]
  });
  return res.status(result.status).json(result.body);
});

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    const result = fail("NOT_FOUND", "endpoint not found", 404);
    return res.status(result.status).json(result.body);
  }
  return res.sendFile(path.join(publicPath, "index.html"));
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    const result = fail("INVALID_BODY", "invalid json payload", 400);
    return res.status(result.status).json(result.body);
  }

  if (String(err?.message || "").startsWith("CORS policy")) {
    const result = fail("CORS_NOT_ALLOWED", err.message, 403);
    return res.status(result.status).json(result.body);
  }

  console.error("Unhandled error:", err);
  const result = fail("INTERNAL_ERROR", "internal server error", 500);
  return res.status(result.status).json(result.body);
});

if (NODE_ENV === "production" && ALLOWED_ORIGINS.length === 0) {
  console.warn("[SECURITY] ALLOWED_ORIGINS is empty in production: cross-origin browser requests will be rejected. Set ALLOWED_ORIGINS if a separate frontend domain calls this API.");
}

const server = app.listen(PORT, () => {
  console.log(`Kkul-Parking server running on http://localhost:${PORT} [${NODE_ENV}]`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timeout. Force exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
