const { inferPriceProfile, estimateParkingFee, won } = require("../public/app.js");
const { calculateAlternativeCost } = require("../server.js");

describe("Parking Fee & Savings Estimation", () => {
  describe("inferPriceProfile", () => {
    test("should identify public parking profiles ('공영')", () => {
      const profile = inferPriceProfile({ name: "남산 공영주차장" });
      expect(profile.base30).toBe(1000);
      expect(profile.per10).toBe(300);
      expect(profile.note).toContain("공영");
    });

    test("should identify commercial facility profiles ('마트', '백화점', '몰')", () => {
      const profile = inferPriceProfile({ name: "이마트 주차장" });
      expect(profile.base30).toBe(2000);
      expect(profile.per10).toBe(500);
      expect(profile.freeUntilMin).toBe(120);

      const profileMall = inferPriceProfile({ name: "타임스퀘어 몰" });
      expect(profileMall.freeUntilMin).toBe(120);
    });

    test("should identify station area profiles ('역', '환승')", () => {
      const profile = inferPriceProfile({ name: "강남역 환승주차장" });
      expect(profile.base30).toBe(1500);
      expect(profile.per10).toBe(400);
      expect(profile.note).toContain("역세권");

      const profileStationOnly = inferPriceProfile({ name: "서울역 민영주차장" });
      expect(profileStationOnly.base30).toBe(1500);
      expect(profileStationOnly.per10).toBe(400);
    });

    test("should default to private parking profile for unclassified spots", () => {
      const profile = inferPriceProfile({ name: "행복주차장" });
      expect(profile.base30).toBe(2000);
      expect(profile.per10).toBe(500);
      expect(profile.note).toContain("민영");
    });
  });

  describe("estimateParkingFee", () => {
    test("should estimate free fee for commercial facility within free time limit (<= 120 mins)", () => {
      const result = estimateParkingFee({ name: "이마트 주차장" }, 120);
      expect(result.amount).toBe(0);
      expect(result.note).toContain("무료 가능");
    });

    test("should calculate fee for public parking for 60 minutes (30m base + 3x10m extra)", () => {
      // Base (30m) = 1,000, Extra (30m = 3 blocks * 300) = 900 -> Total 1,900
      const result = estimateParkingFee({ name: "필동 공영주차장" }, 60);
      expect(result.amount).toBe(1900);
      expect(result.note).toContain("30분 1,000원");
    });

    test("should calculate fee for private parking for 120 minutes", () => {
      // Base (30m) = 2,000, Extra (90m = 9 blocks * 500) = 4,500 -> Total 6,500
      const result = estimateParkingFee({ name: "일반 빌딩 주차장" }, 120);
      expect(result.amount).toBe(6500);
    });

    test("should handle minimum stay fallback (under 30 minutes treated as 30 minutes)", () => {
      const result = estimateParkingFee({ name: "필동 공영주차장" }, 10);
      expect(result.amount).toBe(1000);
    });
  });

  describe("won Utility", () => {
    test("should format currency with Korean won unit", () => {
      expect(won(3500)).toBe("3,500원");
      expect(won(0)).toBe("0원");
      expect(won(1000000)).toBe("1,000,000원");
    });
  });

  describe("calculateAlternativeCost (Server)", () => {
    test("should return 0 for FREE spot", () => {
      const cost = calculateAlternativeCost({ type: "FREE" }, 120);
      expect(cost).toBe(0);
    });

    test("should return 0 for CONDITIONAL spot when stay is within free rule limit", () => {
      const spot = { type: "CONDITIONAL", conditional_rule: "2시간 무료" };
      expect(calculateAlternativeCost(spot, 120)).toBe(0);
      expect(calculateAlternativeCost(spot, 60)).toBe(0);
    });

    test("should calculate fee for PUBLIC spot based on unit and base fee", () => {
      const spot = { type: "PUBLIC", base_fee: 1000, fee_unit_min: 10 };
      // 60 minutes / 10 = 6 blocks * 1000 = 6000
      expect(calculateAlternativeCost(spot, 60)).toBe(6000);
    });
  });
});
