#!/usr/bin/env node

// Production startup script with environment checks

const requiredEnvVars = [
  'DATABASE_URL',
  'ANTHROPIC_API_KEY'
];

const optionalEnvVars = [
  'SESSION_SECRET',
  'PORT',
  'NODE_ENV',
  'ALLOWED_ORIGINS'
];

console.log('🚀 Starting XCEO in production mode...\n');

// Check required environment variables
const missing = requiredEnvVars.filter(name => !process.env[name]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(name => console.error(`   - ${name}`));
  console.error('\nPlease set these variables and try again.');
  process.exit(1);
}

// Show configuration
console.log('✅ Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'production'}`);
console.log(`   PORT: ${process.env.PORT || '10000'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✓ Set' : '✗ Using default (not recommended)'}`);

// Warn about optional variables
const missingOptional = optionalEnvVars.filter(name => !process.env[name]);
if (missingOptional.length > 0) {
  console.log('\n⚠️  Optional environment variables not set:');
  missingOptional.forEach(name => console.log(`   - ${name}`));
}

console.log('\n📦 Starting application...\n');

// Start the application using ES module import
import('../dist/index.js');