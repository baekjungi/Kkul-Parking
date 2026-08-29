const {
  isValidLatLng,
  sanitizeText,
  mapType,
  parseXmlRows,
  parsePayloadByType,
  normalizeExternalRows,
  dedupeParkingItems,
  isValidImageUrl,
  isValidHttpUrl
} = require("../server.js");

const {
  mapOsmRowsToSpots,
  dedupeByLocation,
  spotAddressText,
  normalizeTypeLabel,
  normalizeSourceForFilter
} = require("../public/app.js");

describe("Data Normalization & Sanitization Utilities", () => {
  describe("isValidLatLng", () => {
    test("should validate valid latitude and longitude coordinates", () => {
      expect(isValidLatLng(37.5665, 126.9780)).toBe(true);
      expect(isValidLatLng(-90, -180)).toBe(true);
      expect(isValidLatLng(90, 180)).toBe(true);
    });

    test("should reject out-of-bounds or non-numeric coordinates", () => {
      expect(isValidLatLng(91, 126.9780)).toBe(false);
      expect(isValidLatLng(37.5665, 181)).toBe(false);
      expect(isValidLatLng("abc", 126.9780)).toBe(false);
      expect(isValidLatLng(null, undefined)).toBe(false);
      expect(isValidLatLng(NaN, 126.9780)).toBe(false);
    });
  });

  describe("sanitizeText", () => {
    test("should strip control characters and trim whitespace", () => {
      expect(sanitizeText("  Hello\u0000 World! \u0007")).toBe("Hello World!");
    });

    test("should enforce maximum length", () => {
      const longText = "A".repeat(300);
      expect(sanitizeText(longText, 50).length).toBe(50);
    });

    test("should return empty string for null or empty values", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
    });
  });

  describe("mapType", () => {
    test("should normalize valid parking types to uppercase", () => {
      expect(mapType("free")).toBe("FREE");
      expect(mapType("CONDITIONAL")).toBe("CONDITIONAL");
      expect(mapType("public")).toBe("PUBLIC");
      expect(mapType("ALL")).toBe("ALL");
    });

    test("should fallback to ALL for invalid types", () => {
      expect(mapType("INVALID_TYPE")).toBe("ALL");
      expect(mapType(null)).toBe("ALL");
    });
  });

  describe("parseXmlRows", () => {
    test("should parse XML item/row tags into object array", () => {
      const xml = `
        <response>
          <item>
            <prkplceNm>중구 공영주차장</prkplceNm>
            <lat>37.5519</lat>
            <lng>126.9918</lng>
          </item>
        </response>
      `;
      const rows = parseXmlRows(xml);
      expect(rows.length).toBe(1);
      expect(rows[0].prkplceNm).toBe("중구 공영주차장");
      expect(rows[0].lat).toBe("37.5519");
    });

    test("should return empty array for empty or non-string XML", () => {
      expect(parseXmlRows("")).toEqual([]);
      expect(parseXmlRows(null)).toEqual([]);
    });
  });

  describe("normalizeExternalRows (Server)", () => {
    test("should normalize API response objects with Korean or English key aliases", () => {
      const rawPayload = [
        {
          시설명: "서울 타워 주차장",
          위도: "37.5512",
          경도: "126.9882",
          소재지: "서울시 용산구"
        },
        {
          name: "강남역 공영주차장",
          lat: 37.4979,
          lng: 127.0276,
          address: "서울시 강남구"
        }
      ];

      const normalized = normalizeExternalRows(rawPayload, "TEST_SOURCE", 37.5500, 126.9900);
      expect(normalized.length).toBe(2);

      expect(normalized[0].name).toBe("서울 타워 주차장");
      expect(normalized[0].lat).toBe(37.5512);
      expect(normalized[0].lng).toBe(126.9882);
      expect(normalized[0].address).toBe("서울시 용산구");
      expect(typeof normalized[0].distance_m).toBe("number");

      expect(normalized[1].name).toBe("강남역 공영주차장");
      expect(normalized[1].source).toBe("TEST_SOURCE");
    });

    test("should filter out rows without valid coordinates", () => {
      const invalidPayload = [
        { name: "좌표없는 주차장" }
      ];
      const normalized = normalizeExternalRows(invalidPayload, "TEST_SOURCE");
      expect(normalized.length).toBe(0);
    });
  });

  describe("mapOsmRowsToSpots (Client)", () => {
    test("should map Nominatim OSM rows containing parking keywords", () => {
      const osmRows = [
        {
          lat: "37.5547",
          lon: "126.9707",
          name: "서울역 주차장",
          display_name: "서울특별시 중구 봉래동2가"
        },
        {
          lat: "37.5500",
          lon: "126.9900",
          name: "일반 식당",
          display_name: "서울특별시 중구 맛집"
        }
      ];

      const center = { lat: 37.5519, lng: 126.9918 };
      const spots = mapOsmRowsToSpots(osmRows, "osm_test", center);

      expect(spots.length).toBe(1);
      expect(spots[0].name).toBe("서울역 주차장");
      expect(spots[0].source).toBe("OSM");
      expect(spots[0].lat).toBe(37.5547);
    });
  });

  describe("Deduplication Utilities", () => {
    test("dedupeParkingItems should filter out duplicate spots with identical coordinates and name", () => {
      const items = [
        { lat: 37.55, lng: 126.99, name: "중구 주차장" },
        { lat: 37.55, lng: 126.99, name: "중구 주차장" },
        { lat: 37.56, lng: 126.98, name: "종로 주차장" }
      ];

      const result = dedupeParkingItems(items);
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("중구 주차장");
      expect(result[1].name).toBe("종로 주차장");
    });

    test("dedupeByLocation (Client) should remove duplicates", () => {
      const items = [
        { lat: 37.5519, lng: 126.9918, name: "필동 주차장", layer: "PARKING" },
        { lat: 37.5519, lng: 126.9918, name: "필동 주차장", layer: "PARKING" }
      ];
      const result = dedupeByLocation(items);
      expect(result.length).toBe(1);
    });
  });

  describe("URL & Image Validation", () => {
    test("isValidHttpUrl should validate http and https URLs", () => {
      expect(isValidHttpUrl("https://example.com/photo.jpg")).toBe(true);
      expect(isValidHttpUrl("http://example.com/photo.png")).toBe(true);
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    });

    test("isValidImageUrl should validate http/https and local /uploads/ URLs", () => {
      expect(isValidImageUrl("/uploads/img_12345.jpg")).toBe(true);
      expect(isValidImageUrl("https://cdn.example.com/img.png")).toBe(true);
      expect(isValidImageUrl("invalid_path")).toBe(false);
    });
  });

  describe("Label and Text Formatting", () => {
    test("normalizeTypeLabel should return correct Korean label for parking types", () => {
      expect(normalizeTypeLabel("FREE")).toBe("100% 무료");
      expect(normalizeTypeLabel("CONDITIONAL")).toBe("조건부 무료");
      expect(normalizeTypeLabel("PUBLIC")).toBe("공영");
    });

    test("spotAddressText should fallback gracefully across address fields", () => {
      expect(spotAddressText({ address: "서울시 중구" })).toBe("서울시 중구");
      expect(spotAddressText({ road_address_name: "도로명주소" })).toBe("도로명주소");
      expect(spotAddressText({ address_name: "지번주소" })).toBe("지번주소");
      expect(spotAddressText({})).toBe("");
    });
  });
});
