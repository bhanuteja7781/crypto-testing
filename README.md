# Secure Transaction API & Automation Framework

A local prototype of a secure transaction processing system built with **Node.js**, **Express**, and **Playwright**. The project demonstrates a two-step challenge-response authentication workflow designed to protect transaction APIs against payload tampering, replay attacks, and timestamp manipulation.

---

## Features

* Two-step challenge-response transaction workflow
* HMAC-SHA512 request signing
* Timestamp validation to prevent clock-skew attacks
* Replay attack detection using signature tracking
* Playwright API automation tests
* Lightweight Express-based mock secure gateway

---

## Architecture Overview

The system separates transaction creation from transaction authorization.

### Transaction Flow

```text
┌──────────────────────────────┐
│      Playwright Client       │
└──────────────┬───────────────┘
               │
               │ POST /api/transactions
               ▼
┌──────────────────────────────┐
│     Secure Mock Gateway      │
│  Generates:                  │
│  • Transaction ID            │
│  • Nonce                     │
│  • Server Timestamp          │
└──────────────┬───────────────┘
               │
               │ 211 Created
               │ Challenge Headers
               ▼
┌──────────────────────────────┐
│      Playwright Client       │
│ Computes HMAC-SHA512         │
└──────────────┬───────────────┘
               │
               │ PUT /api/transactions/:id
               │ Signed Payload + Headers
               ▼
┌──────────────────────────────┐
│     Secure Mock Gateway      │
│ Performs Validation          │
│ • Timestamp Check            │
│ • Replay Detection           │
│ • HMAC Verification          │
└──────────────┬───────────────┘
               │
               ▼
          200 OK
```

---

## Validation Pipeline

Every authenticated request passes through the following middleware sequence:

### 1. Timestamp Validation

Checks that the client's timestamp is within the permitted time window.

```
| Server Time − Client Time | ≤ 5 minutes
```

Expired requests are rejected immediately.

---

### 2. Replay Detection

The server maintains an in-memory collection of previously used request signatures.

If the incoming signature already exists:

* Request is rejected
* HTTP **403 Forbidden** is returned

---

### 3. HMAC Verification

The server recalculates the HMAC-SHA512 signature using:

* Raw request body
* Timestamp
* Nonce
* Shared secret

If the computed signature differs from the supplied signature, the request is rejected with:

```
401 Unauthorized
```

---

## Project Structure

```text
secure-transaction-api/
│
├── server.js
├── package.json
├── README.md
│
└── tests/
    └── api.spec.js
```

### File Descriptions

| File              | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| server.js         | Express server with security validation middleware |
| tests/api.spec.js | Playwright automation tests                        |
| package.json      | Project dependencies                               |
| README.md         | Project documentation                              |

---

## Prerequisites

* Node.js 18 or later
* npm

---

## Installation

Clone the repository and install the required packages.

```bash
npm install
```

Or install dependencies manually:

```bash
npm install express @playwright/test
```

---

## Running the Project

### Step 1 — Start the Server

```bash
node server.js
```

The server starts at:

```
http://localhost:3000
```

---

### Step 2 — Execute Playwright Tests

Open another terminal and run:

```bash
npx playwright test --reporter=line
```

---

## Test Coverage

The automation suite validates the following security scenarios.

### Challenge Generation

* Creates a new transaction
* Returns:

  * Transaction ID
  * Nonce
  * Server Timestamp

---

### Successful Signed Transaction

Verifies that a correctly signed request is accepted.

Expected response:

```
200 OK
```

---

### Replay Attack Protection

Simulates sending the exact same signed request twice.

Expected responses:

First request:

```
200 OK
```

Second request:

```
403 Forbidden
```

---

### Payload Integrity

Confirms that modifying the request payload invalidates the HMAC signature.

Expected response:

```
401 Unauthorized
```

---

### Timestamp Validation

Verifies that stale or future timestamps outside the allowed window are rejected.

Expected response:

```
401 Unauthorized
```

---

## Technologies Used

* Node.js
* Express.js
* Playwright
* JavaScript
* Crypto (HMAC-SHA512)

---

## Security Features

* Challenge-response authentication
* HMAC-SHA512 request signing
* Nonce-based request validation
* Timestamp verification
* Replay attack prevention
* Middleware-based security pipeline

---

## Future Improvements

* Redis-backed replay protection
* Persistent transaction storage
* JWT-based authentication
* Request rate limiting
* HTTPS/TLS support
* Docker containerization
* CI/CD integration with GitHub Actions

---

## License

This project is intended for educational and demonstration purposes.

---
