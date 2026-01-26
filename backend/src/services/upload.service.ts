import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import { AppError } from '../utils/errors.js';

interface CDNConfig {
  provider: 'aws' | 'cloudflare';
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnUrl?: string;
  publicBucket?: boolean;
}

interface UploadOptions {
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

interface UploadResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  size: number;
  mimeType: string;
}

export class UploadService {
  private s3Client: S3Client | null = null;
  private config: CDNConfig | null = null;
  private isEnabled: boolean = false;
  private defaultOptions: Required<UploadOptions> = {
    generateThumbnail: false,
    thumbnailWidth: 300,
    thumbnailHeight: 300,
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  };

  constructor() {
    const config = this.loadConfig();
    if (config) {
      this.config = config;
      this.s3Client = this.createClient();
      this.isEnabled = true;
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  private loadConfig(): CDNConfig {
    const provider = (process.env.CDN_PROVIDER || 'aws') as 'aws' | 'cloudflare';
    
    const config: CDNConfig = {
      provider,
      bucket: process.env.CDN_BUCKET || '',
      region: process.env.CDN_REGION || 'us-east-1',
      accessKeyId: process.env.CDN_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY || '',
      cdnUrl: process.env.CDN_URL,
      publicBucket: process.env.CDN_PUBLIC_BUCKET === 'true',
    };

    if (provider === 'cloudflare') {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!accountId) {
        throw new Error('CLOUDFLARE_ACCOUNT_ID es requerido para Cloudflare R2');
      }
      config.endpoint = 'https://' + accountId + '.r2.cloudflarestorage.com';
    }

    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      console.warn('[UploadService] CDN configuration incomplete - upload features will be disabled');
      return null as unknown as CDNConfig;
    }

    return config;
  }

  private createClient(): S3Client | null {
    if (!this.config) return null;

    const clientConfig: any = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    };

    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    return new S3Client(clientConfig);
  }

  private generateFileName(originalName: string): string {
    const ext = originalName.split('.').pop() || 'jpg';
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return timestamp + '-' + hash + '.' + ext;
  }

  private getPublicUrl(key: string): string {
    if (!this.config) throw new AppError('Upload service not configured', 503);

    if (this.config.cdnUrl) {
      return this.config.cdnUrl + '/' + key;
    }

    if (this.config.provider === 'cloudflare' && this.config.publicBucket) {
      return 'https://pub-' + this.config.bucket + '.r2.dev/' + key;
    }

    return 'https://' + this.config.bucket + '.s3.' + this.config.region + '.amazonaws.com/' + key;
  }

  private async validateFile(buffer: Buffer, mimeType: string, options: Required<UploadOptions>): Promise<void> {
    const maxSizeMB = options.maxFileSize / 1024 / 1024;
    if (buffer.length > options.maxFileSize) {
      throw new AppError('El archivo excede el tamaño máximo permitido (' + maxSizeMB + 'MB)', 400);
    }

    if (!options.allowedMimeTypes.includes(mimeType)) {
      const allowedTypes = options.allowedMimeTypes.join(', ');
      throw new AppError('Tipo de archivo no permitido. Tipos permitidos: ' + allowedTypes, 400);
    }

    try {
      await sharp(buffer).metadata();
    } catch (error) {
      throw new AppError('El archivo no es una imagen válida', 400);
    }
  }

  private async generateThumbnail(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(buffer).resize(width, height, { fit: 'cover', position: 'center' }).jpeg({ quality: 80 }).toBuffer();
  }

  private async optimizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    const sharpInstance = sharp(buffer);

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return sharpInstance.jpeg({ quality: 85, progressive: true }).toBuffer();
    } else if (mimeType === 'image/png') {
      return sharpInstance.png({ compressionLevel: 9 }).toBuffer();
    } else if (mimeType === 'image/webp') {
      return sharpInstance.webp({ quality: 85 }).toBuffer();
    }

    return buffer;
  }

  async uploadImage(buffer: Buffer, originalName: string, mimeType: string, options: Partial<UploadOptions> = {}): Promise<UploadResult> {
    if (!this.isEnabled || !this.s3Client || !this.config) {
      throw new AppError('Upload service not configured', 503);
    }

    const mergedOptions = { ...this.defaultOptions, ...options };
    await this.validateFile(buffer, mimeType, mergedOptions);
    const optimizedBuffer = await this.optimizeImage(buffer, mimeType);
    const fileName = this.generateFileName(originalName);
    const key = 'images/' + fileName;
    const contentType = mimeType;
    const cacheControl = 'public, max-age=31536000, immutable';

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: optimizedBuffer,
        ContentType: contentType,
        CacheControl: cacheControl,
        ...(this.config.publicBucket ? {} : { ACL: 'public-read' }),
      })
    );

    const result: UploadResult = {
      url: this.getPublicUrl(key),
      key,
      size: optimizedBuffer.length,
      mimeType: contentType,
    };

    if (mergedOptions.generateThumbnail) {
      const thumbnailBuffer = await this.generateThumbnail(buffer, mergedOptions.thumbnailWidth, mergedOptions.thumbnailHeight);
      const thumbnailName = this.generateFileName('thumb-' + originalName);
      const thumbnailKey = 'images/thumbnails/' + thumbnailName;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          CacheControl: cacheControl,
          ...(this.config.publicBucket ? {} : { ACL: 'public-read' }),
        })
      );

      result.thumbnailUrl = this.getPublicUrl(thumbnailKey);
      result.thumbnailKey = thumbnailKey;
    }

    return result;
  }

  async deleteImage(key: string): Promise<void> {
    if (!this.isEnabled || !this.s3Client || !this.config) {
      throw new AppError('Upload service not configured', 503);
    }
    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
    } catch (error) {
      throw new AppError('Error al eliminar la imagen', 500);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.s3Client || !this.config) {
      return false;
    }
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isEnabled || !this.s3Client || !this.config) {
      throw new AppError('Upload service not configured', 503);
    }
    const command = new PutObjectCommand({ Bucket: this.config.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getConfig() {
    if (!this.config) {
      return { provider: 'disabled', bucket: '', region: '', cdnUrl: '', publicBucket: false };
    }
    return {
      provider: this.config.provider,
      bucket: this.config.bucket,
      region: this.config.region,
      cdnUrl: this.config.cdnUrl,
      publicBucket: this.config.publicBucket,
    };
  }
}

export const uploadService = new UploadService();
