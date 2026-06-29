# Secure Transaction API & Automation Framework

This project contains a local prototype of a secure, two-step challenge-response API built with **Node.js + Express** alongside a security verification suite built with **Playwright**. 

The architecture simulates strict transaction protection mechanisms against payload tampering, clock skew exploits, and rapid-fire replay attacks.

---

## 🏗️ Architecture Design & Flow

The system splits security operations into an initial asymmetric challenge phase followed by a strictly validated transaction execution phase.

### 1. The Two-Step Lifecycle

```text
[ Client (Playwright) ]                    [ Mock Secure Gateway ]
         │                                            │
         │ 1. POST /api/transactions (Base Data)     │
         ├───────────────────────────────────────────>│ (Generates ID, Nonce,
         │                                            │  & Authoritative Time)
         │ 2. 211 Created + Challenge Headers         │
         │<───────────────────────────────────────────┤
         │                                            │
         │ 3. Compute HMAC-SHA512 locally             │
         │                                            │
         │ 4. PUT /api/transactions/:id               │
         │    (JSON Payload + Cryptographic Headers)  │
         ├───────────────────────────────────────────>│ ──┐
         │                                            │   │ 5. Strict Validation
         │ 5. 200 OK (Finalized)                      │   │    Pipeline Checks
         │<───────────────────────────────────────────┤ <─┘

2. Validation Pipeline Execution Order
Every incoming authenticated request passes through a linear, short-circuiting middleware stack on the server:

Timestamp Validation: Verifies |Server Time - Client Timestamp| <= 5 minutes. Drops expired requests immediately before running heavier processing.

Replay Detection: Looks up the X-Signature header value inside an in-memory Set. If found, a duplicate request is flagged, halting execution with a 403 Forbidden response.

Cryptographic HMAC Verification: Re-hashes the raw inbound payload string combined with the timestamp and nonce strings using a shared secret key. If it does not match X-Signature identically, it throws a 401 Unauthorized block.

🗂️ Project Directory Structure
Plaintext
├── server.js            # Express application with security validation middleware
├── tests/
│   └── api.spec.js      # Playwright API test automation suite (Happy path + Replay simulation)
├── package.json         # Project manifests and dependencies
└── README.md            # Documentation
🛠️ Getting Started
Prerequisites
Node.js (v18 or higher recommended)

npm

Installation
Clone or navigate into your project directory and install the necessary dependencies:

Bash
# Install core express dependencies and Playwright test runner
npm install express @playwright/test
🚀 Execution Guide
To thoroughly test the security mechanisms, run the backend mock gateway and the validation tests in separate terminal instances.

Step 1: Start the Secure Mock Server
Bash
node server.js
The server will boot and listen natively on http://localhost:3000.

Step 2: Execute Playwright Security Automation Tests
In a second terminal window, run the test suites:

Bash
# Run tests and print results directly to the console
npx playwright test --reporter=line
🧪 Security Scenario Validation Coverage
The Playwright automated tests validate specific architectural security parameters:

Challenge Acceptance: Verifies that an unauthenticated transaction initiation request properly returns authoritative nonces, tracking IDs, and server times within response headers.

Cryptographic Signing (Happy Path): Validates that an authorized client constructing an accurate HMAC-SHA512 configuration updates transaction states safely (200 OK).

Replay Attack Defenses (Within 150ms): Simulates an active attacker intercepting the fully signed network transaction packet and trying to re-execute it immediately. Asserts that the server blocks the subsequent action with a 403 Forbidden error and keeps data stores pristine.
