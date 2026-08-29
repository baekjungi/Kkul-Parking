const request = require("supertest");
const { app } = require("../server.js");

describe("API Endpoint Integration Tests", () => {
  describe("GET /api/health", () => {
    test("should return 200 OK and health status payload", async () => {
      const response = await request(app).get("/api/health");
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe("kkul-parking-api");
      expect(response.body.data.status).toBe("ok");
    });
  });

  describe("GET /api/config/client", () => {
    test("should return client configuration and feature flags", async () => {
      const response = await request(app).get("/api/config/client");
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("kakao_enabled");
      expect(response.body.data).toHaveProperty("kakao_rest_enabled");
      expect(response.body.data).toHaveProperty("gongyu_enabled");
    });
  });

  describe("GET /api/meta/popular-destinations", () => {
    test("should return popular search destination list", async () => {
      const response = await request(app).get("/api/meta/popular-destinations");
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/parking/unified-search", () => {
    test("should return 400 when missing lat/lng parameters", async () => {
      const response = await request(app).get("/api/parking/unified-search");
      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_QUERY");
    });

    test("should return 200 and search results when valid coordinates provided", async () => {
      const response = await request(app)
        .get("/api/parking/unified-search")
        .query({ lat: 37.5519, lng: 126.9918, radius: 5000 });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("total");
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe("GET /api/reports & POST /api/reports", () => {
    test("should return list of reports from SQLite DB", async () => {
      const response = await request(app).get("/api/reports");
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    test("should reject report with invalid body validation", async () => {
      const response = await request(app)
        .post("/api/reports")
        .send({
          parking_name: "X", // too short
          type: "INVALID",
          lat: "abc",
          lng: 126.9918,
          rule_text: "short"
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_BODY");
    });

    test("should successfully create a valid report in SQLite DB", async () => {
      const uniqueName = `테스트주차장_${Date.now()}`;
      const payload = {
        parking_name: uniqueName,
        type: "FREE",
        lat: 37.5665,
        lng: 126.9780,
        address: "서울시 중구 태평로1가",
        rule_text: "주말 전면 무료 개방 주차장입니다.",
        image_urls: ["/uploads/test_sample.jpg"],
        memo: "테스트 제보 메모입니다."
      };

      const response = await request(app)
        .post("/api/reports")
        .send(payload);

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("report_id");
      expect(response.body.data.review_status).toBe("PENDING");
    });
  });

  describe("404 Route Handler", () => {
    test("should return 404 formatted error JSON for unknown /api route", async () => {
      const response = await request(app).get("/api/non-existent-endpoint");
      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
