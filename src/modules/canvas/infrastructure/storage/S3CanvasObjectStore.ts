import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';

export interface S3ObjectStoreOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  // MinIO and other self-hosted S3 services; unset for Tigris
  endpoint?: string;
}

// One store per process. Tigris in production, MinIO in development — both
// speak S3, so the same client serves both.
export class S3CanvasObjectStore implements ICanvasObjectStore {
  private client: S3Client;
  private bucket: string;
  // Buckets aren't created for us (MinIO never, Tigris only from the
  // command line), so make sure one exists before the first request. A bad
  // config surfaces as request errors, not a crash loop.
  private ensureBucket: Promise<void>;

  constructor(options: S3ObjectStoreOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      ...(options.endpoint && {
        endpoint: options.endpoint,
        // MinIO addresses buckets by path, not subdomain
        forcePathStyle: true,
      }),
    });
    this.ensureBucket = this.createBucketIfMissing();
  }

  private async createBucketIfMissing() {
    try {
      await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }),
      );
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode !== 404) throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.ensureBucket;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string) {
    await this.ensureBucket;
    try {
      const out = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!out.Body) return null;
      return Buffer.from(await out.Body.transformToByteArray());
    } catch (error: any) {
      if (error?.name === 'NoSuchKey') return null;
      if (error?.$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }

  async delete(key: string) {
    await this.ensureBucket;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deletePrefix(prefix: string) {
    await this.ensureBucket;
    let token: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const keys = (listed.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => key !== undefined);
      if (keys.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  }
}
