-- ============================================
-- Script: Verificar Estado de Índices
-- ============================================
-- Este script ayuda a verificar que todos los índices
-- de performance están creados y siendo utilizados.

-- 1. LISTAR TODOS LOS ÍNDICES POR TABLA
-- ============================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 2. TAMAÑO DE ÍNDICES (Top 10)
-- ============================================
SELECT
    schemaname || '.' || tablename AS table,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 3. ÍNDICES NO UTILIZADOS (Candidatos para eliminar)
-- ============================================
-- NOTA: Solo ejecutar después de varios días en producción
SELECT
    schemaname || '.' || tablename AS table,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_key'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. ESTADÍSTICAS DE USO DE ÍNDICES
-- ============================================
SELECT
    schemaname || '.' || tablename AS table,
    indexname,
    idx_scan as times_used,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 5. VERIFICAR ÍNDICES ESPECÍFICOS DE PERFORMANCE
-- ============================================
-- User table indexes
SELECT 'User_email_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'User_email_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

SELECT 'User_role_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'User_role_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- Product table indexes
SELECT 'Product_sellerId_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Product_sellerId_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

SELECT 'Product_category_status_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Product_category_status_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- Order table indexes
SELECT 'Order_userId_status_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Order_userId_status_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

SELECT 'Order_sellerId_status_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Order_sellerId_status_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- Booking table indexes
SELECT 'Booking_userId_status_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Booking_userId_status_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

SELECT 'Booking_status_createdAt_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'Booking_status_createdAt_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- ExperienceTimeSlot table indexes
SELECT 'ExperienceTimeSlot_experienceId_date_idx' as index_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE indexname = 'ExperienceTimeSlot_experienceId_date_idx'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- 6. CACHE HIT RATIO (Debe ser >95%)
-- ============================================
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit)  as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;

-- 7. ÍNDICES DUPLICADOS (Candidatos para eliminar)
-- ============================================
SELECT
    pg_size_pretty(sum(pg_relation_size(idx))::BIGINT) AS size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
         COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key
HAVING count(*) > 1
ORDER BY sum(pg_relation_size(idx)) DESC;

-- 8. ÍNDICES BLOATED (Necesitan REINDEX)
-- ============================================
-- NOTA: Query complejo, solo ejecutar si sospechas de bloat
SELECT
    schemaname || '.' || tablename AS table,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 9. ESTADÍSTICAS DE TABLAS (ANALYZE)
-- ============================================
SELECT
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 10. RECOMENDACIONES
-- ============================================
-- Si una tabla tiene >10% dead rows, ejecutar:
-- VACUUM ANALYZE table_name;

-- Si un índice no se usa en 30+ días:
-- DROP INDEX CONCURRENTLY index_name;

-- Si cache hit ratio <95%:
-- Aumentar shared_buffers en postgresql.conf

-- Para reconstruir índice bloated:
-- REINDEX INDEX CONCURRENTLY index_name;
