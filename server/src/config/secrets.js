/**
 * Centralized JWT Secret Management
 * Server MUST crash if JWT_SECRET is not configured.
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   Set it in your .env file or environment before starting the server.');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}

module.exports = { JWT_SECRET };
