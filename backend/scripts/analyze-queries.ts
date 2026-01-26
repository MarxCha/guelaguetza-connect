/**
 * Script de Análisis de Performance de Queries
 *
 * Usa EXPLAIN ANALYZE para identificar queries lentas y problemas de performance.
 *
 * Uso:
 *   npx tsx scripts/analyze-queries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

interface QueryAnalysis {
  name: string;
  query: string;
  executionTime: number;
  plan?: string;
}

const analyses: QueryAnalysis[] = [];

// Capturar queries ejecutadas
prisma.$on('query', (e: any) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});

/**
 * Ejecuta EXPLAIN ANALYZE en una query para ver el plan de ejecución
 */
async function explainQuery(name: string, sqlQuery: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analizando: ${name}`);
  console.log('='.repeat(80));

  const startTime = performance.now();

  try {
    // EXPLAIN ANALYZE ejecuta la query y retorna el plan con tiempos reales
    const result = await prisma.$queryRawUnsafe<any[]>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sqlQuery}`
    );

    const executionTime = performance.now() - startTime;
    const plan = JSON.stringify(result[0], null, 2);

    analyses.push({
      name,
      query: sqlQuery,
      executionTime,
      plan,
    });

    console.log('\nPlan de Ejecución:');
    console.log(plan);
    console.log(`\nTiempo de Ejecución: ${executionTime.toFixed(2)}ms`);

    // Analizar plan para warnings
    const planStr = JSON.stringify(result[0]);

    if (planStr.includes('Seq Scan')) {
      console.log('⚠️  WARNING: Seq Scan detectado - considera agregar índice');
    }

    if (planStr.includes('rows=')) {
      const rowsMatch = planStr.match(/rows=(\d+)/);
      if (rowsMatch && parseInt(rowsMatch[1]) > 1000) {
        console.log('⚠️  WARNING: Scan de muchas filas - optimizar filtros');
      }
    }

  } catch (error) {
    console.error(`Error analizando query: ${error}`);
  }
}

/**
 * Queries principales a analizar
 */
async function analyzeMainQueries() {
  console.log('\n🔍 ANÁLISIS DE PERFORMANCE DE QUERIES\n');

  // 1. Listado de Stories con filtro de ubicación
  await explainQuery(
    'Stories - Listado con ubicación',
    `
    SELECT s.*,
           u.id as user_id, u.nombre, u.avatar,
           COUNT(DISTINCT l.id) as likes_count,
           COUNT(DISTINCT c.id) as comments_count
    FROM "Story" s
    LEFT JOIN "User" u ON s."userId" = u.id
    LEFT JOIN "Like" l ON s.id = l."storyId"
    LEFT JOIN "Comment" c ON s.id = c."storyId"
    WHERE s.location ILIKE '%Oaxaca%'
    GROUP BY s.id, u.id, u.nombre, u.avatar
    ORDER BY s."createdAt" DESC
    LIMIT 20
    `
  );

  // 2. Bookings de usuario con status
  await explainQuery(
    'Bookings - Por usuario y status',
    `
    SELECT b.*,
           e.title as experience_title,
           ts.date as slot_date,
           ts."startTime" as slot_start
    FROM "Booking" b
    INNER JOIN "Experience" e ON b."experienceId" = e.id
    INNER JOIN "ExperienceTimeSlot" ts ON b."timeSlotId" = ts.id
    WHERE b."userId" = (SELECT id FROM "User" LIMIT 1)
      AND b.status IN ('CONFIRMED', 'PENDING')
    ORDER BY b."createdAt" DESC
    LIMIT 20
    `
  );

  // 3. Productos por categoría y status
  await explainQuery(
    'Products - Por categoría activos',
    `
    SELECT p.*,
           sp."businessName" as seller_name,
           u.nombre as seller_user_name,
           COUNT(pr.id) as reviews_count
    FROM "Product" p
    INNER JOIN "SellerProfile" sp ON p."sellerId" = sp.id
    INNER JOIN "User" u ON sp."userId" = u.id
    LEFT JOIN "ProductReview" pr ON p.id = pr."productId"
    WHERE p.category = 'ARTESANIA'
      AND p.status = 'ACTIVE'
    GROUP BY p.id, sp.id, sp."businessName", u.nombre
    ORDER BY p."createdAt" DESC
    LIMIT 20
    `
  );

  // 4. Órdenes de vendedor
  await explainQuery(
    'Orders - Por vendedor con items',
    `
    SELECT o.*,
           u.nombre as buyer_name,
           u.email as buyer_email,
           COUNT(oi.id) as items_count
    FROM "Order" o
    INNER JOIN "User" u ON o."userId" = u.id
    INNER JOIN "OrderItem" oi ON o.id = oi."orderId"
    WHERE o."sellerId" = (SELECT id FROM "SellerProfile" LIMIT 1)
      AND o.status IN ('PENDING', 'PAID', 'PROCESSING')
    GROUP BY o.id, u.nombre, u.email
    ORDER BY o."createdAt" DESC
    LIMIT 20
    `
  );

  // 5. Time Slots disponibles por experiencia
  await explainQuery(
    'Time Slots - Disponibles por fecha',
    `
    SELECT ts.*,
           e.title as experience_title,
           (ts.capacity - ts."bookedCount") as available_spots
    FROM "ExperienceTimeSlot" ts
    INNER JOIN "Experience" e ON ts."experienceId" = e.id
    WHERE ts.date >= CURRENT_DATE
      AND ts.date <= CURRENT_DATE + INTERVAL '30 days'
      AND ts."isAvailable" = true
      AND e."isActive" = true
    ORDER BY ts.date ASC, ts."startTime" ASC
    LIMIT 50
    `
  );

  // 6. Activity Log por usuario
  await explainQuery(
    'Activity Log - Actividad reciente de usuario',
    `
    SELECT al.*,
           u.nombre as user_name
    FROM "ActivityLog" al
    INNER JOIN "User" u ON al."userId" = u.id
    WHERE al."userId" = (SELECT id FROM "User" LIMIT 1)
      AND al.action IN ('CREATE_STORY', 'LIKE', 'COMMENT')
      AND al."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY al."createdAt" DESC
    LIMIT 100
    `
  );

  // 7. Notificaciones no leídas
  await explainQuery(
    'Notifications - No leídas por usuario',
    `
    SELECT n.*
    FROM "Notification" n
    WHERE n."userId" = (SELECT id FROM "User" LIMIT 1)
      AND n.read = false
    ORDER BY n."createdAt" DESC
    LIMIT 50
    `
  );
}

/**
 * Análisis de índices
 */
async function analyzeIndexes() {
  console.log('\n\n📊 ANÁLISIS DE ÍNDICES\n');
  console.log('='.repeat(80));

  const indexStats = await prisma.$queryRaw<any[]>`
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC
  `;

  console.log('\nÍndices más usados:');
  console.table(indexStats.slice(0, 20));

  // Índices no usados
  const unusedIndexes = indexStats.filter((idx) => idx.index_scans === 0);
  if (unusedIndexes.length > 0) {
    console.log('\n⚠️  Índices no utilizados (candidatos para eliminación):');
    console.table(unusedIndexes);
  }
}

/**
 * Análisis de tamaño de tablas
 */
async function analyzeTableSizes() {
  console.log('\n\n💾 TAMAÑO DE TABLAS\n');
  console.log('='.repeat(80));

  const tableSizes = await prisma.$queryRaw<any[]>`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  `;

  console.table(tableSizes);
}

/**
 * Análisis de queries lentas
 */
async function analyzeSlowQueries() {
  console.log('\n\n🐌 QUERIES LENTAS (requiere pg_stat_statements)\n');
  console.log('='.repeat(80));

  try {
    // Verificar si pg_stat_statements está habilitado
    const extension = await prisma.$queryRaw<any[]>`
      SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'
    `;

    if (extension.length === 0) {
      console.log('ℹ️  pg_stat_statements no está habilitado.');
      console.log('   Para habilitarlo, agregar a postgresql.conf:');
      console.log('   shared_preload_libraries = \'pg_stat_statements\'');
      return;
    }

    const slowQueries = await prisma.$queryRaw<any[]>`
      SELECT
        LEFT(query, 100) as query_preview,
        calls,
        total_exec_time::numeric(10,2) as total_time_ms,
        mean_exec_time::numeric(10,2) as avg_time_ms,
        max_exec_time::numeric(10,2) as max_time_ms
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;

    console.table(slowQueries);
  } catch (error) {
    console.log(`ℹ️  No se pudo analizar queries lentas: ${error}`);
  }
}

/**
 * Reporte de recomendaciones
 */
function generateRecommendations() {
  console.log('\n\n💡 RECOMENDACIONES\n');
  console.log('='.repeat(80));

  const recommendations = [
    {
      priority: 'Alta',
      category: 'Índices',
      recommendation: 'Verificar que los índices compuestos están siendo utilizados',
      action: 'Revisar pg_stat_user_indexes para confirmar idx_scan > 0',
    },
    {
      priority: 'Alta',
      category: 'Queries',
      recommendation: 'Evitar SELECT * - usar select específicos',
      action: 'Modificar queries para traer solo campos necesarios',
    },
    {
      priority: 'Media',
      category: 'N+1',
      recommendation: 'Usar include/select en Prisma para evitar N+1',
      action: 'Revisar servicios que hacen múltiples queries en loops',
    },
    {
      priority: 'Media',
      category: 'Paginación',
      recommendation: 'Limitar resultados con take/limit',
      action: 'Asegurar que todas las listas tengan paginación',
    },
    {
      priority: 'Baja',
      category: 'Connection Pool',
      recommendation: 'Configurar connection_limit en DATABASE_URL',
      action: 'Agregar ?connection_limit=10&pool_timeout=20',
    },
    {
      priority: 'Baja',
      category: 'Caching',
      recommendation: 'Implementar caching para datos frecuentes',
      action: 'Usar Redis para cachear experiencias, productos, etc.',
    },
  ];

  console.table(recommendations);
}

/**
 * Main
 */
async function main() {
  try {
    // Ejecutar análisis
    await analyzeMainQueries();
    await analyzeIndexes();
    await analyzeTableSizes();
    await analyzeSlowQueries();

    // Generar recomendaciones
    generateRecommendations();

    console.log('\n\n✅ Análisis completado\n');

    // Guardar reporte en archivo
    const reportPath = './query-analysis-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      analyses,
    };

    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Reporte guardado en: ${reportPath}\n`);
  } catch (error) {
    console.error('Error ejecutando análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { analyzeMainQueries, analyzeIndexes, analyzeTableSizes };
