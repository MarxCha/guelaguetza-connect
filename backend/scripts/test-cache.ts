#!/usr/bin/env tsx
/**
 * Script de prueba para verificar la conexión y funcionalidad del cache Redis
 *
 * Uso:
 *   npm run dev -- scripts/test-cache.ts
 *   tsx scripts/test-cache.ts
 */

import 'dotenv/config';
import { CacheService } from '../src/services/cache.service.js';

async function testCache() {
  console.log('🧪 Testing Redis Cache Service\n');

  const cache = new CacheService();

  // Test 1: Conexión
  console.log('1️⃣  Testing connection...');
  try {
    await cache.set('test:connection', 'OK', 10);
    const value = await cache.get('test:connection');
    if (value === 'OK') {
      console.log('✅ Connection successful\n');
    } else {
      console.log('❌ Connection failed - unexpected value\n');
      return;
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.log('\n⚠️  Make sure Redis is running:');
    console.log('   brew services start redis  (macOS)');
    console.log('   sudo systemctl start redis (Linux)');
    console.log('   docker run -d -p 6379:6379 redis:7-alpine\n');
    return;
  }

  // Test 2: Set & Get
  console.log('2️⃣  Testing set & get...');
  const testData = { name: 'Guelaguetza', year: 2026 };
  await cache.set('test:data', testData, 60);
  const retrieved = await cache.get<typeof testData>('test:data');
  console.log('   Set:', testData);
  console.log('   Get:', retrieved);
  console.log(
    retrieved?.name === 'Guelaguetza' ? '✅ Passed\n' : '❌ Failed\n'
  );

  // Test 3: TTL
  console.log('3️⃣  Testing TTL...');
  await cache.set('test:ttl', 'expires soon', 2);
  const ttl = await cache.ttl('test:ttl');
  console.log(`   TTL: ${ttl} seconds`);
  console.log(ttl > 0 && ttl <= 2 ? '✅ Passed\n' : '❌ Failed\n');

  // Test 4: Exists
  console.log('4️⃣  Testing exists...');
  const exists = await cache.exists('test:data');
  const notExists = await cache.exists('test:nonexistent');
  console.log('   Exists (should be true):', exists);
  console.log('   Not exists (should be false):', notExists);
  console.log(exists && !notExists ? '✅ Passed\n' : '❌ Failed\n');

  // Test 5: Delete
  console.log('5️⃣  Testing delete...');
  await cache.set('test:delete', 'will be deleted', 60);
  const beforeDelete = await cache.exists('test:delete');
  await cache.del('test:delete');
  const afterDelete = await cache.exists('test:delete');
  console.log('   Before delete:', beforeDelete);
  console.log('   After delete:', afterDelete);
  console.log(beforeDelete && !afterDelete ? '✅ Passed\n' : '❌ Failed\n');

  // Test 6: Invalidate pattern
  console.log('6️⃣  Testing pattern invalidation...');
  await cache.set('test:user:1:profile', { name: 'Alice' }, 60);
  await cache.set('test:user:1:badges', ['badge1'], 60);
  await cache.set('test:user:2:profile', { name: 'Bob' }, 60);
  const deleted = await cache.invalidate('test:user:1:*');
  const user1Profile = await cache.exists('test:user:1:profile');
  const user2Profile = await cache.exists('test:user:2:profile');
  console.log('   Deleted keys:', deleted);
  console.log('   User 1 profile exists (should be false):', user1Profile);
  console.log('   User 2 profile exists (should be true):', user2Profile);
  console.log(
    deleted === 2 && !user1Profile && user2Profile ? '✅ Passed\n' : '❌ Failed\n'
  );

  // Test 7: Wrap (Cache-Aside)
  console.log('7️⃣  Testing wrap (cache-aside pattern)...');
  let dbCalls = 0;
  const fetchFromDB = async () => {
    dbCalls++;
    return { data: 'from database', timestamp: Date.now() };
  };

  const result1 = await cache.wrap('test:wrap', fetchFromDB, 60);
  const result2 = await cache.wrap('test:wrap', fetchFromDB, 60);

  console.log('   DB calls:', dbCalls, '(should be 1)');
  console.log('   First call:', result1);
  console.log('   Second call:', result2);
  console.log(dbCalls === 1 ? '✅ Passed\n' : '❌ Failed\n');

  // Test 8: Metrics
  console.log('8️⃣  Testing metrics...');
  cache.resetMetrics();
  await cache.get('test:miss1'); // miss
  await cache.get('test:miss2'); // miss
  await cache.set('test:hit', 'value', 60);
  await cache.get('test:hit'); // hit
  await cache.get('test:hit'); // hit

  const metrics = cache.getMetrics();
  const hitRate = cache.getHitRate();

  console.log('   Hits:', metrics.hits);
  console.log('   Misses:', metrics.misses);
  console.log('   Hit rate:', hitRate.toFixed(2) + '%');
  console.log(
    metrics.hits === 2 && metrics.misses === 2 && hitRate === 50
      ? '✅ Passed\n'
      : '❌ Failed\n'
  );

  // Test 9: Increment
  console.log('9️⃣  Testing increment...');
  await cache.del('test:counter');
  const count1 = await cache.incr('test:counter', 1);
  const count2 = await cache.incr('test:counter', 5);
  const count3 = await cache.incr('test:counter', 10);
  console.log('   After +1:', count1);
  console.log('   After +5:', count2);
  console.log('   After +10:', count3);
  console.log(
    count1 === 1 && count2 === 6 && count3 === 16 ? '✅ Passed\n' : '❌ Failed\n'
  );

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await cache.invalidate('test:*');

  // Final stats
  console.log('\n📊 Final Statistics:');
  console.log('   Cache ready:', cache.isReady());
  console.log('   Final metrics:', cache.getMetrics());

  // Disconnect
  await cache.disconnect();
  console.log('\n✅ All tests completed!\n');
}

// Run tests
testCache().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
