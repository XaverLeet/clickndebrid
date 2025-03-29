#!/usr/bin/env node

/**
 * This is a wrapper script for release-it that suppresses DEP0174 deprecation warnings.
 * The warning occurs because release-it is using util.promisify on functions that already return promises.
 */

// Suppress the DEP0174 deprecation warning
process.env.NODE_OPTIONS = '--no-deprecation';

// Run release-it with the provided arguments
import('release-it').then(releaseIt => {
  releaseIt.default.cli().catch(error => {
    console.error(error);
    process.exit(1);
  });
}).catch(error => {
  console.error('Failed to import release-it:', error);
  process.exit(1);
});