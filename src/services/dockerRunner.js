const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CPU_LIMIT = process.env.CPU_LIMIT || '1';
const MEMORY_LIMIT = process.env.MEMORY_LIMIT || '256m';
const PIDS_LIMIT = process.env.PIDS_LIMIT || '100';

const MEM_PEAK_CMD = 'echo __MEM_PEAK__:$(cat /sys/fs/cgroup/memory.current 2>/dev/null || cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null || echo 0)';

/**
 * Supported Language Configurations with cgroups RAM memory tracking
 */
const LANGUAGE_CONFIGS = {
  'cpp': {
    fileName: 'solution.cpp',
    dockerImage: 'gcc:latest',
    compileAndRun: `g++ -O2 /app/solution.cpp -o /tmp/a.out && /tmp/a.out < /app/input.txt && ${MEM_PEAK_CMD}`
  },
  'c++': {
    fileName: 'solution.cpp',
    dockerImage: 'gcc:latest',
    compileAndRun: `g++ -O2 /app/solution.cpp -o /tmp/a.out && /tmp/a.out < /app/input.txt && ${MEM_PEAK_CMD}`
  },
  'java': {
    fileName: 'Solution.java',
    dockerImage: 'eclipse-temurin:17',
    compileAndRun: `javac /app/Solution.java -d /tmp && java -cp /tmp Solution < /app/input.txt && ${MEM_PEAK_CMD}`
  },
  'javascript': {
    fileName: 'solution.js',
    dockerImage: 'node:20-alpine',
    compileAndRun: `node /app/solution.js < /app/input.txt && ${MEM_PEAK_CMD}`
  },
  'js': {
    fileName: 'solution.js',
    dockerImage: 'node:20-alpine',
    compileAndRun: `node /app/solution.js < /app/input.txt && ${MEM_PEAK_CMD}`
  }
};

/**
 * Executes user code safely inside a sandboxed Docker container for a single test case.
 * Returns exact execution runtime (sec) and peak RAM memory (KB).
 * 
 * @param {string} code - Source code to execute
 * @param {string} input - Standard input (stdin)
 * @param {string} language - 'cpp' | 'java' | 'javascript'
 * @param {number} timeoutMs - Max execution time in ms (default: 10000ms)
 * @returns {Promise<{ status: string, output: string, stderr: string, runtime: number, memory: number }>}
 */
const executeSingleCode = (code, input = '', language = 'javascript', timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const langKey = String(language).toLowerCase().trim();
    const config = LANGUAGE_CONFIGS[langKey];

    if (!config) {
      return resolve({
        status: 'error',
        output: '',
        stderr: `Unsupported language '${language}'. Supported languages: c++, java, javascript`,
        runtime: 0,
        memory: 0
      });
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tempDir = path.resolve(process.cwd(), 'temp', jobId);

    try {
      fs.mkdirSync(tempDir, { recursive: true });

      let fileName = config.fileName;
      let compileAndRun = config.compileAndRun;

      // Dynamically extract Java public class name if present (e.g. public class Main or public class Solution)
      if (langKey === 'java') {
        const match = (code || '').match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : 'Solution';
        fileName = `${className}.java`;
        compileAndRun = `javac /app/${className}.java -d /tmp && java -cp /tmp ${className} < /app/input.txt && ${MEM_PEAK_CMD}`;
      }

      const codeFilePath = path.join(tempDir, fileName);
      const inputFilePath = path.join(tempDir, 'input.txt');

      fs.writeFileSync(codeFilePath, code || '');
      fs.writeFileSync(inputFilePath, input || '');

      // Invoke Docker directly instead of passing a nested `docker ...` command
      // through a shell. This makes Node's timeout apply to the Docker process
      // itself and prevents requests from hanging after a timeout.
      const dockerArgs = [
        'run', '--rm',
        '--network=none',
        `--memory=${MEMORY_LIMIT}`,
        `--cpus=${CPU_LIMIT}`,
        `--pids-limit=${PIDS_LIMIT}`,
        '-v', `${tempDir}:/app:ro`,
        config.dockerImage,
        'sh', '-c', compileAndRun
      ];

      const startTime = process.hrtime.bigint();

      execFile('docker', dockerArgs, {
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: 10 * 1024 * 1024
      }, (error, stdout, stderr) => {
        const endTime = process.hrtime.bigint();
        const wallClockRuntimeMs = Number(endTime - startTime) / 1e6;
        const exactRuntimeSec = Number((wallClockRuntimeMs / 1000).toFixed(3));

        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {}

        if (error && (error.killed || error.signal === 'SIGTERM' || error.signal === 'SIGKILL' || error.code === 'ETIMEDOUT')) {
          return resolve({
            status: 'tle',
            output: '',
            stderr: 'Time Limit Exceeded (Execution exceeded limit)',
            runtime: timeoutMs / 1000,
            memory: 0
          });
        }

        const rawStdout = stdout || '';
        const rawStderr = stderr || '';
        const combined = rawStdout + '\n' + rawStderr;

        const memMatch = combined.match(/__MEM_PEAK__:(\d+)/);
        const peakBytes = memMatch ? parseInt(memMatch[1], 10) : 0;
        const exactMemoryKb = Math.round(peakBytes / 1024);

        const cleanOutput = rawStdout.replace(/__MEM_PEAK__:\d+/g, '').trim();
        const cleanStderr = rawStderr.replace(/__MEM_PEAK__:\d+/g, '').trim();

        if (error && !cleanOutput) {
          return resolve({
            status: 'error',
            output: '',
            stderr: cleanStderr || error.message || 'Runtime / Compilation Error',
            runtime: exactRuntimeSec,
            memory: exactMemoryKb
          });
        }

        resolve({
          status: 'success',
          output: cleanOutput,
          stderr: cleanStderr,
          runtime: exactRuntimeSec,
          memory: exactMemoryKb
        });
      });

    } catch (fsErr) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}

      resolve({
        status: 'error',
        output: '',
        stderr: `Server filesystem error: ${fsErr.message}`,
        runtime: 0,
        memory: 0
      });
    }
  });
};

module.exports = { executeSingleCode, LANGUAGE_CONFIGS };
