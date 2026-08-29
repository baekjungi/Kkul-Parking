const { distanceMeters: clientDistanceMeters } = require("../public/app.js");
const { distanceMeters: serverDistanceMeters } = require("../server.js");

describe("distanceMeters Utility", () => {
  // Coordinates for testing
  // Seoul Station: 37.5547, 126.9707
  // Namsan Seoul Tower: 37.5512, 126.9882
  const seoulStation = { lat: 37.5547, lng: 126.9707 };
  const namsanTower = { lat: 37.5512, lng: 126.9882 };

  test("should return 0 when calculating distance to the same point", () => {
    expect(clientDistanceMeters(seoulStation.lat, seoulStation.lng, seoulStation.lat, seoulStation.lng)).toBe(0);
    expect(serverDistanceMeters(seoulStation.lat, seoulStation.lng, seoulStation.lat, seoulStation.lng)).toBe(0);
  });

  test("should calculate correct Haversine distance between Seoul Station and Namsan Tower (~1.6km)", () => {
    const clientDist = clientDistanceMeters(seoulStation.lat, seoulStation.lng, namsanTower.lat, namsanTower.lng);
    const serverDist = serverDistanceMeters(seoulStation.lat, seoulStation.lng, namsanTower.lat, namsanTower.lng);

    expect(clientDist).toBeGreaterThan(1500);
    expect(clientDist).toBeLessThan(1700);
    expect(serverDist).toBe(clientDist);
  });

  test("should be symmetric (distance A to B equals distance B to A)", () => {
    const distAB = clientDistanceMeters(seoulStation.lat, seoulStation.lng, namsanTower.lat, namsanTower.lng);
    const distBA = clientDistanceMeters(namsanTower.lat, namsanTower.lng, seoulStation.lat, seoulStation.lng);

    expect(distAB).toBe(distBA);
  });

  test("should calculate short distance accurately (~100m)", () => {
    // 0.001 deg latitude is approx 111 meters
    const dist = clientDistanceMeters(37.5500, 126.9900, 37.5509, 126.9900);
    expect(dist).toBeGreaterThan(95);
    expect(dist).toBeLessThan(105);
  });
});
