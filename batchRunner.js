const { executeSingleCode } = require('./dockerRunner');

/**
 * Normalizes string outputs by trimming trailing whitespace and line endings (\r\n ➔ \n)
 */
function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').trim();
}

/**
 * Evaluates user code against a batch of test cases inside Docker containers.
 * Returns exact cumulative runtime (sec) and peak RAM memory (KB).
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - 'cpp' | 'java' | 'javascript'
 * @param {Array<{ input: string, output: string }>} testCases - Array of hidden or visible test cases
 * @param {number} timeoutMs - Timeout per test case in ms
 * @returns {Promise<{
 *   status: 'accepted' | 'wrong' | 'error' | 'tle',
 *   testCasesPassed: number,
 *   testCasesTotal: number,
 *   runtime: number,
 *   memory: number,
 *   errorMessage: string | null,
 *   results: Array<object>
 * }>}
 */
const executeBatchCode = async (code, language, testCases = [], timeoutMs = 10000) => {
  let testCasesPassed = 0;
  let totalRuntime = 0;
  let peakMemory = 0;
  let finalStatus = 'accepted';
  let firstErrorMessage = null;
  const results = [];

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return {
      status: 'error',
      testCasesPassed: 0,
      testCasesTotal: 0,
      runtime: 0,
      memory: 0,
      errorMessage: 'No test cases provided for evaluation',
      results: []
    };
  }

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const runResult = await executeSingleCode(code, testCase.input, language, timeoutMs);
    
    totalRuntime += (runResult.runtime || 0);
    peakMemory = Math.max(peakMemory, runResult.memory || 0);

    const actualOutput = normalizeOutput(runResult.output);
    const expectedOutput = normalizeOutput(testCase.output);

    // Exact output match validation
    const isMatch = (runResult.status === 'success') && (expectedOutput !== '') && (actualOutput === expectedOutput);
    const displayOutput = actualOutput || runResult.stderr || (runResult.status === 'tle' ? 'Time Limit Exceeded' : '');

    results.push({
      testCaseNumber: i + 1,
      status: isMatch ? 'passed' : (runResult.status === 'tle' ? 'tle' : (runResult.status === 'error' ? 'error' : 'wrong')),
      status_id: isMatch ? 3 : 4, // 3 = Passed, 4 = Failed/Error (Judge0 compatibility)
      input: testCase.input,
      stdin: testCase.input,
      actualOutput: displayOutput,
      stdout: displayOutput,
      expectedOutput,
      expected_output: expectedOutput,
      runtime: runResult.runtime,
      memory: runResult.memory,
      stderr: runResult.stderr
    });

    if (isMatch) {
      testCasesPassed++;
    } else {
      // Record first failing test case reason
      if (finalStatus === 'accepted') {
        if (runResult.status === 'tle') {
          finalStatus = 'tle';
          firstErrorMessage = `Time Limit Exceeded on Test Case #${i + 1}`;
        } else if (runResult.status === 'error') {
          finalStatus = 'error';
          firstErrorMessage = runResult.stderr || `Compilation / Runtime Error on Test Case #${i + 1}`;
        } else {
          finalStatus = 'wrong';
          firstErrorMessage = `Wrong Answer on Test Case #${i + 1}. Expected: '${expectedOutput}', Got: '${displayOutput}'`;
        }
      }
    }
  }

  return {
    status: finalStatus,
    testCasesPassed,
    testCasesTotal: testCases.length,
    runtime: Number(totalRuntime.toFixed(3)), // Clean 3 decimal places (e.g. 0.009s)
    memory: peakMemory,                              // Exact Peak Memory in KB
    errorMessage: firstErrorMessage,
    results
  };
};

/**
 * Advanced Evaluator: Evaluates user submission against problem document.
 * If expected output is missing in test cases, it executes problem's referenceSolution first to compute expected output dynamically!
 * 
 * @param {string} userCode - User submitted code
 * @param {string} userLanguage - 'c++', 'java', 'javascript'
 * @param {Object} problem - MongoDB Problem document containing visibleTestCases, hiddenTestCases, referenceSolution
 * @param {boolean} isRunOnly - If true, evaluates visibleTestCases; if false, evaluates hiddenTestCases
 * @returns {Promise<object>}
 */
const evaluateProblemSubmission = async (userCode, userLanguage, problem, isRunOnly = false) => {
  const targetTestCases = isRunOnly ? (problem.visibleTestCases || []) : (problem.hiddenTestCases || []);
  
  if (!targetTestCases || targetTestCases.length === 0) {
    return {
      status: 'error',
      testCasesPassed: 0,
      testCasesTotal: 0,
      runtime: 0,
      memory: 0,
      errorMessage: `No ${isRunOnly ? 'visible' : 'hidden'} test cases found for this problem`,
      results: []
    };
  }

  // Check if reference solution fallback is needed (if output field is missing in test case)
  const preparedTestCases = [];
  for (const tc of targetTestCases) {
    let expectedOut = tc.output;

    // If expected output is missing, execute reference solution dynamically to generate output
    if ((expectedOut === undefined || expectedOut === null || expectedOut === '') && Array.isArray(problem.referenceSolution) && problem.referenceSolution.length > 0) {
      const refSol = problem.referenceSolution.find(r => r.language === userLanguage) || problem.referenceSolution[0];
      const refRun = await executeSingleCode(refSol.completeCode, tc.input, refSol.language, 10000);
      expectedOut = refRun.output;
    }

    preparedTestCases.push({
      input: tc.input,
      output: expectedOut,
      explanation: tc.explanation
    });
  }

  return await executeBatchCode(userCode, userLanguage, preparedTestCases);
};

module.exports = { executeBatchCode, evaluateProblemSubmission, normalizeOutput };
