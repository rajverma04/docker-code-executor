# Custom Compiler Microservice - Workflow Diagram

> **🎬 High-Quality Animated Architecture Visualization**
>
> **View Options:**
> - **Interactive HTML:** [Open `docs/sandbox-workflow.html`](docs/sandbox-workflow.html) — Full-screen animated diagram with legend
> - **Raw SVG:** [Open `docs/sandbox-workflow.svg`](docs/sandbox-workflow.svg) — Embeddable animated SVG
> - **GitHub Raw:** `https://raw.githubusercontent.com/<user>/<repo>/main/docs/sandbox-workflow.svg` (replace with your repo URL)
>
> The visualization features: dark futuristic dashboard aesthetic, glowing component cards, animated data packets flowing along curved paths, pulsing status indicators, security boundary visualization, and a complete request→response lifecycle animation.

![Architecture Preview](docs/sandbox-workflow.svg)

---

> **Note:** GitHub markdown may not render SVG animations. For the full animated experience, open the HTML file or the raw SVG URL directly in a browser.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[CodeNexus Main Backend<br/>Port 4000] -->|HTTP POST /execute<br/>x-api-key header| B[Custom Compiler<br/>Port 5001]
    end

    subgraph "Custom Compiler Microservice"
        B --> C{Auth Middleware}
        C -->|Valid API Key| D[Express Router]
        C -->|Invalid API Key| E[401 Unauthorized]
        D --> F[/health]
        D --> G[/execute/single]
        D --> H[/execute/batch]
        D --> I[/execute/problem]
    end

    subgraph "Execution Services"
        G --> J[executeSingleCode]
        H --> K[executeBatchCode]
        I --> L[evaluateProblemSubmission]
        L --> K
        K --> J
    end

    subgraph "Docker Sandbox Execution"
        J --> M[Create Temp Directory<br/>job_{timestamp}_{random}]
        M --> N[Write code + input files]
        N --> O[Docker Run Command]
        O --> P[Isolated Container<br/>--network=none<br/>--memory=256m<br/>-v temp:/app:ro<br/>--rm]
        P --> Q[Execute Code]
        Q --> R[Parse Output + Metrics]
        R --> S[Cleanup Temp Dir]
        S --> T[Return Result]
    end
```

## Single Execution Flow (`/execute/single`)

> **Animated view:** See the "Client → Auth → Router → executeSingleCode → Docker Pipeline → Return" flow in the [SVG animation](workflow-animation.svg) (top-left to right sections).

```mermaid
sequenceDiagram
    participant Client
    participant Auth
    participant Controller
    participant DockerRunner
    participant Docker
    
    Client->>Auth: POST /execute/single + x-api-key
    Auth->>Controller: Validated request
    Controller->>DockerRunner: executeSingleCode(code, input, lang, timeout)
    DockerRunner->>DockerRunner: Create temp dir + write files
    DockerRunner->>Docker: docker run --rm --network=none --memory=256m -v temp:/app:ro image sh -c "compile && run"
    Docker-->>DockerRunner: stdout/stderr + __MEM_PEAK__
    DockerRunner->>DockerRunner: Parse runtime (hrtime) + memory (cgroups)
    DockerRunner->>DockerRunner: Cleanup temp dir
    DockerRunner-->>Controller: {status, output, stderr, runtime, memory}
    Controller-->>Client: JSON Response
```

## Batch Execution Flow (`/execute/batch`)

> **Animated view:** See the "Router → executeBatchCode ⟲ executeSingleCode (loop) → Aggregate Results" flow in the [SVG animation](workflow-animation.svg) (center service nodes with looping arrows).

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant BatchRunner
    participant DockerRunner
    
    Client->>Controller: POST /execute/batch {code, language, testCases[]}
    Controller->>BatchRunner: executeBatchCode(code, language, testCases)
    loop For each testCase
        BatchRunner->>DockerRunner: executeSingleCode(code, testCase.input, language)
        DockerRunner-->>BatchRunner: {status, output, runtime, memory}
        BatchRunner->>BatchRunner: Normalize output + compare with expected
        BatchRunner->>BatchRunner: Track passed/failed, peak memory, total runtime
    end
    BatchRunner-->>Controller: {status, testCasesPassed, testCasesTotal, runtime, memory, results[]}
    Controller-->>Client: JSON Response
```

## Problem Evaluation Flow (`/execute/problem`)

> **Animated view:** See the "Router → evaluateProblemSubmission → (ref solution?) → executeBatchCode" flow in the [SVG animation](workflow-animation.svg) (rightmost service node connecting to batch).

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant BatchRunner
    participant DockerRunner
    
    Client->>Controller: POST /execute/problem {userCode, userLanguage, problem, isRunOnly}
    Controller->>BatchRunner: evaluateProblemSubmission(userCode, userLanguage, problem, isRunOnly)
    BatchRunner->>BatchRunner: Select testCases (visible vs hidden)
    alt Missing expected output
        BatchRunner->>DockerRunner: executeSingleCode(referenceSolution, testCase.input)
        DockerRunner-->>BatchRunner: Generated expected output
    end
    BatchRunner->>BatchRunner: executeBatchCode(userCode, userLanguage, preparedTestCases)
    BatchRunner-->>Controller: Full evaluation result
    Controller-->>Client: JSON Response
```

## Docker Sandbox Security Model

> **Animated view:** See the three-panel security model (Host System → Container Isolation → Metrics Collection) in the [SVG animation](workflow-animation.svg) (bottom section with pulsing checkmarks).

```mermaid
graph LR
    subgraph "Host System"
        A[Temp Directory<br/>job_xxx] -.->|Read-Only Mount| B[Docker Container]
    end
    
    subgraph "Container Isolation"
        B --> C[--network=none<br/>No Network Access]
        B --> D[--memory=256m<br/>RAM Limit]
        B --> E[--rm<br/>Auto Cleanup]
        B --> F[10s Timeout<br/>Hard Limit]
        B --> G[cgroups v2<br/>memory.current]
    end
    
    subgraph "Metrics Collection"
        G --> H[Peak RAM Bytes]
        H --> I[Convert to KB]
        F --> J[Wall Clock Time]
        J --> K[High-Res hrtime]
    end
```

## API Response Formats

> **Animated view:** Live JSON response examples rendered in the [SVG animation](workflow-animation.svg) (bottom-right corner with syntax highlighting).

### Single Execution Response
```json
{
  "status": "success|error|tle",
  "output": "program stdout",
  "stderr": "compilation/runtime errors",
  "runtime": 0.001,
  "memory": 1024
}
```

### Batch/Problem Response
```json
{
  "status": "accepted|wrong|error|tle",
  "testCasesPassed": 3,
  "testCasesTotal": 5,
  "runtime": 0.045,
  "memory": 2048,
  "errorMessage": "Wrong Answer on Test Case #4...",
  "results": [
    {
      "testCaseNumber": 1,
      "status": "passed",
      "status_id": 3,
      "input": "5 3",
      "actualOutput": "8",
      "expectedOutput": "8",
      "runtime": 0.009,
      "memory": 1024
    }
  ]
}
```