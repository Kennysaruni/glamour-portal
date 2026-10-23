const fs = require("fs");

const outputPath = process.argv[2] || "/tmp/.env.production";

const clean = (val, fallback = "") => {
  if (!val) return fallback;
  const mdMatch = val.match(/\[.*?\]\((.*?)\)/);
  const raw = mdMatch ? mdMatch[1] : val;
  return raw.replace(/^[\s"'`]+|[\s"'`]+$/g, "");
};

const envLines = [
  `DATABASE_URL=${clean(process.env.DATABASE_URL)}`,
  `BETTER_AUTH_SECRET=${clean(process.env.BETTER_AUTH_SECRET)}`,
  `BETTER_AUTH_URL=${clean(process.env.BETTER_AUTH_URL, "https://56-228-23-80.sslip.io")}`,
  `BETTER_AUTH_API_KEY=${clean(process.env.BETTER_AUTH_API_KEY, "ba_ivl9s06c1tmzdk21x6pcw96tynrm3275")}`,
  `AWS_REGION=${clean(process.env.AWS_REGION, "eu-north-1")}`,
  `AWS_S3_BUCKET=${clean(process.env.AWS_S3_BUCKET)}`,
  `AWS_ACCESS_KEY_ID=${clean(process.env.AWS_ACCESS_KEY_ID)}`,
  `AWS_SECRET_ACCESS_KEY=${clean(process.env.AWS_SECRET_ACCESS_KEY)}`,
  `NODE_ENV=production`,
  `PORT=3000`,
  `HOSTNAME=0.0.0.0`,
];

fs.writeFileSync(outputPath, envLines.join("\n") + "\n");
console.log(`Successfully generated environment configuration at: ${outputPath}`);
