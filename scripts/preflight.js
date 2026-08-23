const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "server.js",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "data/parking-spots.json",
  "data/reports.json",
  ".env.example",
  "package.json"
];

let failed = false;

function checkFileExists(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] missing file: ${file}`);
    failed = true;
    return;
  }
  console.log(`[OK] file exists: ${file}`);
}

function checkJson(file) {
  const fullPath = path.join(root, file);
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    JSON.parse(raw);
    console.log(`[OK] valid json: ${file}`);
  } catch (error) {
    console.error(`[FAIL] invalid json: ${file}`);
    failed = true;
  }
}

function checkEnvExample() {
  const envPath = path.join(root, ".env.example");
  const raw = fs.readFileSync(envPath, "utf-8");
  const required = [
    "PORT=",
    "DESTINATION_HOURLY_FEE=",
    "NODE_ENV=",
    "ALLOWED_ORIGINS=",
    "RATE_LIMIT_WINDOW_MS=",
    "RATE_LIMIT_MAX=",
    "REPORT_RATE_LIMIT_MAX="
  ];

  for (const key of required) {
    if (!raw.includes(key)) {
      console.error(`[FAIL] .env.example missing key: ${key}`);
      failed = true;
    } else {
      console.log(`[OK] .env.example key: ${key}`);
    }
  }
}

function checkPackageScripts() {
  const packagePath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  const requiredScripts = ["start", "dev", "preflight"];

  for (const script of requiredScripts) {
    if (!pkg.scripts || !pkg.scripts[script]) {
      console.error(`[FAIL] missing npm script: ${script}`);
      failed = true;
    } else {
      console.log(`[OK] npm script: ${script}`);
    }
  }
}

console.log("\n=== Kkul-Parking Preflight Check ===\n");

for (const file of requiredFiles) {
  checkFileExists(file);
}

checkJson("data/parking-spots.json");
checkJson("data/reports.json");
checkEnvExample();
checkPackageScripts();

if (failed) {
  console.error("\nPreflight check failed.");
  process.exit(1);
}

console.log("\nPreflight check passed.");
