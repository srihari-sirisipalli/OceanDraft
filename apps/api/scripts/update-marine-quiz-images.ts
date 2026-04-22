/* eslint-disable no-console */
/**
 * Replace the images on the 50 imported ship-trivia questions with the
 * resized JPEGs the operator prepared under a folder-per-question layout:
 *
 *   <root>/Question_1/000001.jpg
 *   <root>/Question_2/000001.jpeg
 *   ...
 *   <root>/Question_50/000001.jpg
 *
 * Folder Question_N maps to the N-th ship-trivia question when those
 * questions are ordered by ticketNumber ASC (that matches the order the
 * Excel importer created them in). If a folder contains both a main image
 * and a thumbnail, the script picks the larger `000001.*` and skips
 * `thumb_temp.png`.
 *
 * Usage:
 *   npm run -w @oceandraft/api update:marine-quiz-images -- \
 *     [--root "C:\\Users\\Sri\\Downloads\\quiz_images\\quiz_images"]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const DEFAULT_ROOT = 'C:\\Users\\Sri\\Downloads\\quiz_images\\quiz_images';

function parseArgs(argv: string[]): { root: string } {
  const i = argv.indexOf('--root');
  if (i >= 0 && argv[i + 1]) return { root: path.resolve(argv[i + 1]) };
  return { root: DEFAULT_ROOT };
}

function mimeForExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'jpeg' || e === 'jpg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

// Pick the main image file in a Question_N folder. Prefers `000001.*` over
// any `thumb_*` file, and prefers .jpg/.jpeg over .png.
function findMainImage(dir: string): { fullPath: string; ext: string } | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const candidates = entries
    .filter((f) => !f.toLowerCase().startsWith('thumb'))
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (candidates.length === 0) return null;
  // Stable preference: jpg > jpeg > webp > png, then lexicographic.
  const priority: Record<string, number> = { jpg: 0, jpeg: 1, webp: 2, png: 3 };
  candidates.sort((a, b) => {
    const ea = a.split('.').pop()!.toLowerCase();
    const eb = b.split('.').pop()!.toLowerCase();
    const pa = priority[ea] ?? 99;
    const pb = priority[eb] ?? 99;
    return pa - pb || a.localeCompare(b);
  });
  const chosen = candidates[0];
  const ext = chosen.split('.').pop()!.toLowerCase().replace('jpeg', 'jpg');
  return { fullPath: path.join(dir, chosen), ext };
}

async function ensureS3(): Promise<{ client: S3Client; bucket: string }> {
  const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
  const region = process.env.S3_REGION ?? 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY ?? 'minio';
  const secretAccessKey = process.env.S3_SECRET_KEY ?? 'miniosecret';
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true';
  const bucket = process.env.S3_BUCKET ?? 'oceandraft-media';

  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`Created bucket ${bucket}`);
    } catch (e) {
      console.warn(
        `S3 bucket ${bucket} not accessible: ${(e as Error).message}. Continuing.`,
      );
    }
  }

  return { client, bucket };
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  console.log(`Scanning root: ${root}`);

  if (!fs.existsSync(root)) {
    console.error(`Folder not found: ${root}`);
    process.exit(2);
  }

  const prisma = new PrismaClient();
  const { client: s3, bucket } = await ensureS3();

  const category = await prisma.category.findUnique({
    where: { slug: 'ship-trivia' },
  });
  if (!category) {
    console.error('Category "ship-trivia" does not exist. Run import:marine-quiz first.');
    process.exit(2);
  }

  const questions = await prisma.question.findMany({
    where: { categoryId: category.id },
    orderBy: { ticketNumber: 'asc' },
    select: {
      id: true,
      title: true,
      ticketNumber: true,
      primaryMediaId: true,
      stemMarkdown: true,
    },
  });
  console.log(
    `Found ${questions.length} ship-trivia questions in DB (ordered by ticketNumber).`,
  );

  let replaced = 0;
  let attached = 0;
  let missing = 0;
  let skipped = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    const folderNum = i + 1; // Question_1..Question_50
    const folder = path.join(root, `Question_${folderNum}`);
    const hit = findMainImage(folder);
    if (!hit) {
      missing++;
      console.warn(
        `  [${folderNum.toString().padStart(2, ' ')}] No main image found in ${folder} — skipping.`,
      );
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(hit.fullPath);
    } catch (e) {
      skipped++;
      console.warn(
        `  [${folderNum.toString().padStart(2, ' ')}] Failed to read ${hit.fullPath}: ${(e as Error).message}`,
      );
      continue;
    }

    const mime = mimeForExt(hit.ext);
    const key = `questions/ship-trivia/resized/${crypto.randomUUID()}.${hit.ext}`;
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
        }),
      );
    } catch (e) {
      skipped++;
      console.warn(
        `  [${folderNum.toString().padStart(2, ' ')}] S3 upload failed: ${(e as Error).message}`,
      );
      continue;
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        storageKey: key,
        originalName: path.basename(hit.fullPath),
        mimeType: mime,
        sizeBytes: buffer.length,
        checksumSha256: checksum,
        altText: q.stemMarkdown.slice(0, 200),
      },
    });

    const had = q.primaryMediaId != null;
    await prisma.question.update({
      where: { id: q.id },
      data: { primaryMediaId: asset.id, type: 'IMAGE' },
    });
    if (had) replaced++;
    else attached++;

    const size = (buffer.length / 1024).toFixed(1);
    console.log(
      `  [${folderNum.toString().padStart(2, ' ')}] ${had ? 'replaced' : 'attached'}  ` +
        `#${q.ticketNumber ?? '-'}  (${size} KB)  ${path.basename(hit.fullPath)}`,
    );
  }

  console.log('');
  console.log(
    `✅ Replaced ${replaced}, newly attached ${attached}, missing ${missing}, skipped ${skipped}.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
