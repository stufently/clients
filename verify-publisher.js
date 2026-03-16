const { verifySignature } = require("electron-updater/out/windowsExecutableCodeSignatureVerifier");

const exePath = process.argv[2];
const publisherName = "Bitwarden Inc.";

const logger = {
  info: (msg) => console.log("[INFO]", msg),
  warn: (msg) => console.warn("[WARN]", msg),
};

verifySignature([publisherName], exePath, logger).then((result) => {
  if (result == null) {
    console.log("✓ Signature verified successfully");
  } else {
    console.error("✗ Verification failed:", result);
  }
});
