/** @type {import('jest').Config} */
const config = {
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',

    reporters: [
        'default',
        ['jest-html-reporter', {
            outputPath: 'coverage/test-report.html',
            pageTitle: 'CRM API SDK Test Report',
            includeFailureMsg: true,
            includeConsoleLog: true,
        }],
    ],

    // Run via `npm test`, which invokes unit and integration as two separate
    // `jest --selectProjects` calls (integration also with --runInBand)
    // rather than one combined parallel run: Jest has a multi-project quirk
    // where a later project's tests can silently fall back to the global
    // 5000ms default instead of this project's own testTimeout when both
    // projects run together in one process, and integration tests hit a
    // single-threaded `php artisan serve` backend that serializes requests
    // anyway — parallel workers just queue up and time out against it.
    projects: [
        {
            displayName: 'unit',
            testMatch: [
                '<rootDir>/tests/client.test.js',
                '<rootDir>/tests/api/**/*.test.js',
            ],
            transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
        },
        {
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
            transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
            setupFiles: ['<rootDir>/tests/integration/loadEnv.js'],
            // Generous — a locally-built test container occasionally makes an
            // individual request take 10-20s+ under CPU contention.
            testTimeout: 60000,
        },
    ],
};

export default config;
