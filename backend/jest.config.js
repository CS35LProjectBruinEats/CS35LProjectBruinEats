module.exports = {
    testEnvironment: 'node',
    // DB round-trips plus bcrypt hashing during signup make these slower than a
    // typical unit test, so give each test a generous ceiling.
    testTimeout: 20000,
};
