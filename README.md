# 🐳 Sandboxed Docker Code Execution Microservice

A lightweight, secure, and high-performance code execution engine built with **Node.js**, **Express**, and **Docker**.

It natively compiles and runs **C++**, **Java**, and **JavaScript** inside isolated, ephemeral Docker containers.

---

## 🏗️ Architecture & How Code Is Executed

```text
┌───────────────────────────────────────┐           HTTP POST (x-api-key)           ┌───────────────────────────────────────┐
│        CodeNexus Main Backend         │  ──────────────────────────────────────>  │     customCompiler Microservice       │
│  (Calls compilerClient.js wrapper)    │    http://localhost:5001/execute         │       (Express API on Port 5001)       │
└───────────────────────────────────────┘                                           └───────────────────────────────────────┘
                                                                                                        │
                                                                                                        ▼
                                                                                    ┌───────────────────────────────────────┐
                                                                                    │     Isolated Docker Containers        │
                                                                                    │  --network=none --memory=256m (:ro)   │
                                                                                    └───────────────────────────────────────┘
```

### Code Execution Flow:
1. **API Request**: Accepts code execution payload via REST API protected by `x-api-key` header authentication and `ALLOWED_BACKEND_URL` CORS filtering.
2. **Ephemeral Sandbox Creation**: Spawns an isolated Docker container per execution job with:
   - `--network=none`: Blocks all inbound and outbound network access.
   - `--memory=256m`: Caps RAM allocation to 256MB.
   - `-v <tempDir>:/app:ro`: Mounts user code as **READ-ONLY (`:ro`)**.
   - 10-second hard execution timeout.
3. **Real-Time Metrics Extraction**:
   - **Peak RAM Memory (KB)**: Parsed directly from container `cgroups v2` (`/sys/fs/cgroup/memory.current`).
   - **High-Resolution Runtime (sec)**: Computed using high-precision wall-clock timers (`process.hrtime.bigint()`).
4. **Cleanup**: Automatically removes container (`--rm`) and deletes temporary job files.

---

## 🛠️ Environment Configuration (`.env`)

Create a `.env` file in the root of `customCompiler/`:

```env
PORT=5001
COMPILER_API_KEY=your_secret_api_key_here
ALLOWED_BACKEND_URL=http://localhost:4000
```

---

## 🚀 Quick Setup & Run

### 1. Prerequisites
Ensure Docker Desktop is installed and running, then pull the required runtime images:

```bash
docker pull gcc:latest
docker pull eclipse-temurin:17
docker pull node:20-alpine
```

### 2. Installation
```bash
# Install dependencies
npm install

# Start in Development Mode (with Nodemon on Port 5001)
npm run dev

# Start in Production Mode
npm start

# Run Test Execution Suite
npm test
```

---

## 📡 API Endpoints

* **`GET /health`** - Microservice health check
* **`POST /execute/single`** - Execute single code snippet (Playground / Sandbox tester)
* **`POST /execute/batch`** - Evaluate batch test cases
* **`POST /execute/problem`** - Evaluate full problem submissions
