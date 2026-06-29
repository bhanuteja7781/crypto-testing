const crypto = require("crypto");

const SHARED_SECRET = "super-secret-key-12345";

function generateNonce(length = 16) {
    return crypto.randomBytes(length).toString("hex");
}

function generateTimestamp() {
    return new Date().toISOString();
}
function generateSignature(body, timestamp, nonce) {
    const rawBody = body ? JSON.stringify(body) : "";

    return crypto
        .createHmac("sha512", SHARED_SECRET)
        .update(rawBody + timestamp + nonce)
        .digest("hex");
}

module.exports = {
    SHARED_SECRET,
    generateNonce,
    generateTimestamp,
    generateSignature
};
