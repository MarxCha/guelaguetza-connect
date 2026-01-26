import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadService } from '../src/services/upload.service.js';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext || 'jpg'] || 'image/jpeg';
}

async function migrateProductImages(dryRun: boolean = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log('🔍 Buscando productos con imágenes locales...');

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { imageUrl: { startsWith: '/images/' } },
        { imageUrl: { startsWith: '/public/images/' } },
        { imageUrl: { startsWith: 'public/images/' } },
      ],
    },
  });

  console.log(`📦 Encontrados ${products.length} productos con imágenes locales`);

  for (const product of products) {
    try {
      const imageUrl = product.imageUrl;
      const filename = imageUrl.split('/').pop() || '';
      
      const possiblePaths = [
        path.join(__dirname, '../../public/images', filename),
        path.join(__dirname, '../../../public/images', filename),
      ];

      let filePath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }

      if (!filePath) {
        console.warn(`⚠️  Archivo no encontrado: ${filename} (producto: ${product.name})`);
        result.skipped++;
        continue;
      }

      console.log(`📤 Subiendo: ${filename}...`);

      const buffer = fs.readFileSync(filePath);
      const mimeType = getMimeType(filename);

      if (!dryRun) {
        const uploadResult = await uploadService.uploadImage(
          buffer,
          filename,
          mimeType,
          {
            generateThumbnail: true,
            thumbnailWidth: 300,
            thumbnailHeight: 300,
          }
        );

        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: uploadResult.url,
          },
        });

        console.log(`✅ Migrado: ${filename} -> ${uploadResult.url}`);
        result.success++;
      } else {
        console.log(`[DRY RUN] Migraría: ${filename}`);
        result.success++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error migrando ${product.name}:`, errorMessage);
      result.failed++;
      result.errors.push({
        file: product.imageUrl,
        error: errorMessage,
      });
    }
  }

  return result;
}

async function migrateEventImages(dryRun: boolean = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log('🔍 Buscando eventos con imágenes locales...');

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { imageUrl: { startsWith: '/images/' } },
        { imageUrl: { startsWith: '/public/images/' } },
        { imageUrl: { startsWith: 'public/images/' } },
      ],
    },
  });

  console.log(`📅 Encontrados ${events.length} eventos con imágenes locales`);

  for (const event of events) {
    try {
      const imageUrl = event.imageUrl || '';
      const filename = imageUrl.split('/').pop() || '';
      
      const possiblePaths = [
        path.join(__dirname, '../../public/images', filename),
        path.join(__dirname, '../../../public/images', filename),
      ];

      let filePath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }

      if (!filePath) {
        console.warn(`⚠️  Archivo no encontrado: ${filename} (evento: ${event.title})`);
        result.skipped++;
        continue;
      }

      console.log(`📤 Subiendo: ${filename}...`);

      const buffer = fs.readFileSync(filePath);
      const mimeType = getMimeType(filename);

      if (!dryRun) {
        const uploadResult = await uploadService.uploadImage(
          buffer,
          filename,
          mimeType,
          {
            generateThumbnail: true,
            thumbnailWidth: 600,
            thumbnailHeight: 400,
          }
        );

        await prisma.event.update({
          where: { id: event.id },
          data: {
            imageUrl: uploadResult.url,
          },
        });

        console.log(`✅ Migrado: ${filename} -> ${uploadResult.url}`);
        result.success++;
      } else {
        console.log(`[DRY RUN] Migraría: ${filename}`);
        result.success++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error migrando ${event.title}:`, errorMessage);
      result.failed++;
      result.errors.push({
        file: event.imageUrl || '',
        error: errorMessage,
      });
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const type = args.find((arg) => ['products', 'events', 'all'].includes(arg)) || 'all';

  console.log('🚀 Iniciando migración de imágenes a CDN');
  console.log(`📋 Modo: ${dryRun ? 'DRY RUN (no se harán cambios)' : 'PRODUCCIÓN'}`);
  console.log(`🎯 Tipo: ${type}`);
  console.log('');

  const config = uploadService.getConfig();
  console.log('⚙️  Configuración CDN:');
  console.log(`   Provider: ${config.provider}`);
  console.log(`   Bucket: ${config.bucket}`);
  console.log(`   Region: ${config.region}`);
  console.log(`   CDN URL: ${config.cdnUrl || 'N/A'}`);
  console.log('');

  let productResult: MigrationResult | null = null;
  let eventResult: MigrationResult | null = null;

  if (type === 'products' || type === 'all') {
    console.log('═══════════════════════════════════════');
    console.log('📦 MIGRANDO PRODUCTOS');
    console.log('═══════════════════════════════════════');
    productResult = await migrateProductImages(dryRun);
  }

  if (type === 'events' || type === 'all') {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📅 MIGRANDO EVENTOS');
    console.log('═══════════════════════════════════════');
    eventResult = await migrateEventImages(dryRun);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('═══════════════════════════════════════');

  if (productResult) {
    console.log('Productos:');
    console.log(`  ✅ Exitosos: ${productResult.success}`);
    console.log(`  ❌ Fallidos: ${productResult.failed}`);
    console.log(`  ⏭️  Omitidos: ${productResult.skipped}`);
  }

  if (eventResult) {
    console.log('Eventos:');
    console.log(`  ✅ Exitosos: ${eventResult.success}`);
    console.log(`  ❌ Fallidos: ${eventResult.failed}`);
    console.log(`  ⏭️  Omitidos: ${eventResult.skipped}`);
  }

  const totalErrors = [
    ...(productResult?.errors || []),
    ...(eventResult?.errors || []),
  ];

  if (totalErrors.length > 0) {
    console.log('');
    console.log('❌ ERRORES:');
    totalErrors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  await prisma.$disconnect();

  if (dryRun) {
    console.log('');
    console.log('ℹ️  Esto fue un DRY RUN. Para ejecutar la migración real, ejecuta:');
    console.log(`   npm run migrate:images -- ${type}`);
  }
}

main().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
