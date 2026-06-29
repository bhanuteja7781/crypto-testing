const express = require("express");
const crypto = require("crypto");
const {
    SHARED_SECRET,
    generateNonce,
    generateTimestamp,
    generateSignature
} = require("./utils/crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    })
);

const transactionLedger = [];
const replayCache = new Set();

function findTransaction(id) {
    return transactionLedger.find(tx => tx.id === id);
}

function securityMiddleware(req, res, next) {
    const timestamp = req.header("X-Timestamp");
    const nonce = req.header("X-Nonce");
    const signature = req.header("X-Signature");

    if (!timestamp || !nonce || !signature) {
        return res.status(401).json({
            error: "Missing security headers"
        });
    }

    const clientTime = new Date(timestamp).getTime();

    if (
        Number.isNaN(clientTime) ||
        Math.abs(Date.now() - clientTime) > TIMESTAMP_WINDOW_MS
    ) {
        return res.status(400).json({
            error: "Request expired or invalid timestamp"
        });
    }

    if (replayCache.has(signature)) {
        return res.status(403).json({
            error: "Replay Attack Detected"
        });
    }

    const expectedSignature = crypto
        .createHmac("sha512", SHARED_SECRET)
        .update((req.rawBody || "") + timestamp + nonce)
        .digest("hex");

    if (expectedSignature !== signature) {
        return res.status(401).json({
            error: "Invalid HMAC signature"
        });
    }

    const transaction = findTransaction(req.params.id);

    if (!transaction) {
        return res.status(404).json({
            error: "Transaction not found"
        });
    }

    if (
        transaction.challengeNonce !== nonce ||
        transaction.challengeTimestamp !== timestamp
    ) {
        return res.status(401).json({
            error: "Challenge values do not match"
        });
    }

    replayCache.add(signature);

    setTimeout(() => {
        replayCache.delete(signature);
    }, TIMESTAMP_WINDOW_MS);

    next();
}
app.post("/api/transactions", (req, res) => {
    const { amount, currency, recipient } = req.body;

    if (!amount || !currency || !recipient) {
        return res.status(400).json({
            error: "Missing required transaction fields"
        });
    }

    const transactionId = `tx_${crypto.randomBytes(6).toString("hex")}`;
    const challengeNonce = generateNonce();
    const challengeTimestamp = generateTimestamp();

    const transaction = {
        id: transactionId,
        amount,
        currency,
        recipient,
        status: "pending",
        challengeNonce,
        challengeTimestamp
    };

    transactionLedger.push(transaction);

    res.setHeader("X-Transaction-Id", transactionId);
    res.setHeader("X-Nonce", challengeNonce);
    res.setHeader("X-Timestamp", challengeTimestamp);

    return res.status(201).json({
        message: "Transaction initiated",
        data: {
            id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
            recipient: transaction.recipient,
            status: transaction.status
        }
    });
});

app.put("/api/transactions/:id", securityMiddleware, (req, res) => {
    const { status } = req.body;

    const transaction = findTransaction(req.params.id);

    transaction.status = status || "completed";

    return res.status(200).json({
        message: "Transaction finalized",
        data: transaction
    });
});

app.get("/", (req, res) => {
    res.json({
        application: "Cryptographic Replay Testing API",
        status: "Running"
    });
});

app.listen(PORT, () => {
    console.log(`Challenge-Response Secure Gateway running on port ${PORT}`);
});
