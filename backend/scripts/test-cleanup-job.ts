#!/usr/bin/env tsx
/**
 * Script de prueba para el job de limpieza de pagos
 *
 * Uso:
 *   npx tsx scripts/test-cleanup-job.ts
 */

import 'dotenv/config';
import { runCleanupJob } from '../src/jobs/cleanup-payments.job.js';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Testing Cleanup Job                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const result = await runCleanupJob();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Test Results                                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

main();
