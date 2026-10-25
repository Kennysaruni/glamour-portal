const fs = require("fs");

const outputPath = process.argv[2] || "/tmp/.env.production";

const clean = (val, fallback = "") => {
  if (!val) return fallback;
  const mdMatch = val.match(/\[.*?\]\((.*?)\)/);
  const raw = mdMatch ? mdMatch[1] : val;
  return raw.replace(/^[\s"'`]+|[\s"'`]+$/g, "");
};

function sanitizeDatabaseUrl(raw) {
  if (!raw) return "";
  let url = clean(raw);

  // Strip brackets around host when it's NOT an IPv6 address
  url = url.replace(/@\[([^\]:]+)\](:|\/|\?|$)/g, "@$1$2");

  // Strip brackets around password or username
  url = url.replace(/:\[([^\]]+)\]@/g, ":$1@");
  url = url.replace(/:\/\/\[([^\]]+)\]:/g, "://$1:");

  // Strip stray unclosed bracket at beginning of host (e.g., @[mydb.rds.amazonaws.com:5432)
  url = url.replace(/@\[([^\]:]+)(:|\/|\?|$)/g, "@$1$2");

  // Encode password if it has unencoded reserved characters
  const urlMatch = url.match(/^([a-zA-Z0-9+.-]+:\/\/)([^:]+):([^@]+)@(.*)$/);
  if (urlMatch) {
    const [, protocol, user, pass, rest] = urlMatch;
    let cleanRest = rest;
    if (cleanRest.startsWith("[") && !cleanRest.includes("]")) {
      cleanRest = cleanRest.slice(1);
    }
    cleanRest = cleanRest.replace(/^\[([^\]:]+)\](:|\/|\?|$)/g, "$1$2");

    try {
      const decodedUser = decodeURIComponent(user);
      const decodedPass = decodeURIComponent(pass);
      url = `${protocol}${encodeURIComponent(decodedUser)}:${encodeURIComponent(decodedPass)}@${cleanRest}`;
    } catch {
      // Keep existing pass if decode fails
    }
  }

  return url;
}

const envLines = [
  `DATABASE_URL=${sanitizeDatabaseUrl(process.env.DATABASE_URL)}`,
  `BETTER_AUTH_SECRET=${clean(process.env.BETTER_AUTH_SECRET)}`,
  `BETTER_AUTH_URL=${clean(process.env.BETTER_AUTH_URL, "https://56-228-23-80.sslip.io")}`,
  `BETTER_AUTH_API_KEY=${clean(process.env.BETTER_AUTH_API_KEY, "ba_ivl9s06c1tmzdk21x6pcw96tynrm3275")}`,
  `AWS_REGION=${clean(process.env.AWS_REGION, "eu-north-1")}`,
  `AWS_S3_BUCKET=${clean(process.env.AWS_S3_BUCKET)}`,
  `AWS_ACCESS_KEY_ID=${clean(process.env.AWS_ACCESS_KEY_ID)}`,
  `AWS_SECRET_ACCESS_KEY=${clean(process.env.AWS_SECRET_ACCESS_KEY)}`,
  `RESEND_API_KEY=${clean(process.env.RESEND_API_KEY)}`,
  `EMAIL_FROM=${clean(process.env.EMAIL_FROM, "noreply@glamourhomecare.org")}`,
  `NODE_ENV=production`,
  `PORT=3000`,
  `HOSTNAME=0.0.0.0`,
];

fs.writeFileSync(outputPath, envLines.join("\n") + "\n");
console.log(`Successfully generated environment configuration at: ${outputPath}`);
