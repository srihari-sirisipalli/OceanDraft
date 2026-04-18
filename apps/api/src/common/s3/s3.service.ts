import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY ?? 'minio';
    const secretAccessKey = process.env.S3_SECRET_KEY ?? 'miniosecret';
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true';
    this.bucket = process.env.S3_BUCKET ?? 'oceandraft-media';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    });

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (e) {
        this.logger.warn(
          `Unable to verify/create S3 bucket ${this.bucket}: ${(e as Error).message}`,
        );
      }
    }
  }

  async put(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async getStream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      stream: out.Body as Readable,
      contentType: out.ContentType,
      contentLength: out.ContentLength,
    };
  }
}
