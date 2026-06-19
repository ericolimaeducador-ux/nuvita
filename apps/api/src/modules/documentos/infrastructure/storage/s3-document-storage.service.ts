import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppConfigService } from '../../../../common/security/config.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { Readable } from 'stream';
import { DOCUMENT_ACCESS_URL_TTL_SECONDS } from '../../documentos.constants';
import { Documento } from '../../domain/documento.entity';
import {
  DocumentStorage,
  PresignedUploadInput,
  PresignedUploadOutput,
} from '../../application/ports/document-storage';

@Injectable()
export class S3DocumentStorageService implements DocumentStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: AppConfigService) {
    this.bucket = configService.getConfig().documentStorageBucket;
    this.client = new S3Client({
      region: configService.getConfig().documentStorageRegion ?? 'auto',
      endpoint: configService.getConfig().documentStorageEndpoint,
      forcePathStyle: configService.getConfig().documentStorageForcePathStyle,
      credentials: {
        accessKeyId: configService.getConfig().documentStorageAccessKeyId,
        secretAccessKey: configService.getConfig().documentStorageSecretAccessKey,
      },
    });
  }

  async createUploadUrl(input: PresignedUploadInput): Promise<PresignedUploadOutput> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.mimeType,
      ContentLength: input.tamanho,
      Metadata: {
        sha256: input.hash,
      },
    });

    return {
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn: DOCUMENT_ACCESS_URL_TTL_SECONDS }),
      privateUrl: this.privateUrl(input.key),
      expiresInSeconds: DOCUMENT_ACCESS_URL_TTL_SECONDS,
    };
  }

  async createReadUrl(privateUrl: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.keyFromPrivateUrl(privateUrl),
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async createThumbnailIfSupported(documento: Documento): Promise<string | undefined> {
    if (!['image/jpeg', 'image/png'].includes(documento.mimeType)) {
      return undefined;
    }

    const key = this.keyFromPrivateUrl(documento.url);
    const thumbnailKey = `${key}.thumb.jpg`;
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const body = await this.streamToBuffer(object.Body as Readable);
    const thumbnail = await sharp(body).resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
      }),
    );

    return this.privateUrl(thumbnailKey);
  }

  private privateUrl(key: string): string {
    return `s3://${this.bucket}/${key}`;
  }

  private keyFromPrivateUrl(privateUrl: string): string {
    const prefix = `s3://${this.bucket}/`;
    if (!privateUrl.startsWith(prefix)) {
      throw new Error('Invalid private document URL.');
    }

    return privateUrl.slice(prefix.length);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
