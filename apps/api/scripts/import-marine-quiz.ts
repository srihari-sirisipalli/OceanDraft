/* eslint-disable no-console */
/**
 * One-shot importer for Marine_Quiz_With_Images.xlsx.
 *
 *   npm run import:marine-quiz -- [--file <path>]
 *
 * - Adds questions under the `ship-trivia` category (upserted).
 * - Extracts embedded images, puts them to S3/MinIO, creates MediaAsset rows,
 *   and wires them as `primaryMediaId` on the question.
 * - Dedupes by normalized stem, so re-runs are safe.
 */

import * as path from 'path';
import * as crypto from 'crypto';
import ExcelJS from 'exceljs';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import {
  PrismaClient,
  QuestionDifficulty,
  QuestionType,
} from '@prisma/client';

type ExcelMediaItem = {
  name?: string;
  extension?: string;
  buffer?: Buffer;
  // exceljs attaches these at runtime
  [k: string]: unknown;
};

const DEFAULT_XLSX = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'Marine_Quiz_With_Images.xlsx',
);

function normalizeStem(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseArgs(argv: string[]): { file: string } {
  const i = argv.indexOf('--file');
  if (i >= 0 && argv[i + 1]) return { file: path.resolve(argv[i + 1]) };
  return { file: DEFAULT_XLSX };
}

function parseOptions(raw: string): string[] {
  // "A) foo, B) bar, C) baz, D) qux" → ["foo","bar","baz","qux"]
  // Split on ", A)" boundaries more robustly by inserting a delimiter before each letter tag.
  const withDelim = raw.replace(/\s*,?\s*([A-D])\)\s*/g, (_m, letter: string) =>
    letter === 'A' ? '' : '\x1f',
  );
  const parts = withDelim.split('\x1f').map((p) => p.trim()).filter(Boolean);
  return parts;
}

function difficultyFor(stem: string): QuestionDifficulty {
  const n = stem.length;
  if (n < 80) return 'EASY';
  if (n < 140) return 'MEDIUM';
  return 'HARD';
}

function timerFor(d: QuestionDifficulty): number {
  return d === 'EASY' ? 45 : d === 'HARD' ? 25 : 35;
}

function mimeForExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'jpeg' || e === 'jpg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  return 'application/octet-stream';
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
        `S3 bucket ${bucket} not accessible: ${(e as Error).message}. Continuing — images may fail to upload.`,
      );
    }
  }

  return { client, bucket };
}

async function main() {
  const { file } = parseArgs(process.argv.slice(2));
  console.log(`📖 Reading workbook: ${file}`);

  const prisma = new PrismaClient();
  const { client: s3, bucket } = await ensureS3();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found.');

  // Build rowIndex -> imageBuffer map using exceljs image anchors + workbook media.
  const mediaByImageId = new Map<number, ExcelMediaItem>();
  const wbModel = wb.model as unknown as { media?: ExcelMediaItem[] };
  if (wbModel.media) {
    wbModel.media.forEach((m, idx) => {
      mediaByImageId.set(idx, m);
    });
  }
  const imagesByRow = new Map<number, ExcelMediaItem>();
  for (const img of ws.getImages()) {
    // exceljs types: img.imageId is string — convert to number to key media array
    const imageId = Number(img.imageId);
    // tl.nativeRow is 0-indexed; ExcelJS row numbers are 1-indexed.
    const tl = img.range?.tl as { nativeRow?: number } | undefined;
    const rowIdx1 = (tl?.nativeRow ?? 0) + 1;
    const asset = mediaByImageId.get(imageId);
    if (asset) imagesByRow.set(rowIdx1, asset);
  }

  // Upsert category.
  const category = await prisma.category.upsert({
    where: { slug: 'ship-trivia' },
    update: {},
    create: {
      slug: 'ship-trivia',
      name: 'Ship Trivia',
      description: 'Imported from Marine_Quiz_With_Images.xlsx',
    },
  });

  // Creator: reuse any existing SUPER_ADMIN or the first admin user.
  const creator = await prisma.adminUser.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  // Existing normalized-stem set for dedupe.
  const existing = await prisma.question.findMany({
    select: { id: true, stemMarkdown: true },
  });
  const existingStems = new Set(existing.map((q) => normalizeStem(q.stemMarkdown)));

  // Current max ticket number.
  let nextTicket =
    ((await prisma.question.aggregate({ _max: { ticketNumber: true } }))._max
      .ticketNumber ?? 0) + 1;

  let imported = 0;
  let skipped = 0;
  let withImage = 0;

  // Rows start at 2 (row 1 is header).
  const lastRow = ws.actualRowCount ?? ws.rowCount;
  for (let rowIdx = 2; rowIdx <= lastRow; rowIdx++) {
    const row = ws.getRow(rowIdx);
    const questionCell = row.getCell(3).value;
    const optionsCell = row.getCell(4).value;
    const answerCell = row.getCell(5).value;

    const stem = String(questionCell ?? '').trim();
    const optionsRaw = String(optionsCell ?? '').trim();
    const answer = String(answerCell ?? '').trim().toUpperCase();
    if (!stem || !optionsRaw || !answer) continue;

    if (existingStems.has(normalizeStem(stem))) {
      skipped++;
      continue;
    }

    const options = parseOptions(optionsRaw);
    if (options.length !== 4) {
      console.warn(`Row ${rowIdx}: expected 4 options, got ${options.length} — skipping.`);
      continue;
    }
    const correctIndex = 'ABCD'.indexOf(answer);
    if (correctIndex < 0) {
      console.warn(`Row ${rowIdx}: unrecognised answer "${answer}" — skipping.`);
      continue;
    }

    // Image upload, if present.
    let primaryMediaId: string | null = null;
    const media = imagesByRow.get(rowIdx);
    if (media && media.buffer && media.buffer.length > 0) {
      const ext = (media.extension ?? 'png').toLowerCase().replace('jpeg', 'jpg');
      const mime = mimeForExt(ext);
      const key = `questions/ship-trivia/${crypto.randomUUID()}.${ext}`;
      const checksum = crypto
        .createHash('sha256')
        .update(media.buffer)
        .digest('hex');
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: media.buffer,
            ContentType: mime,
          }),
        );
        const asset = await prisma.mediaAsset.create({
          data: {
            storageKey: key,
            originalName: media.name ?? `row-${rowIdx}.${ext}`,
            mimeType: mime,
            sizeBytes: media.buffer.length,
            checksumSha256: checksum,
            altText: stem.slice(0, 200),
            createdById: creator?.id ?? null,
          },
        });
        primaryMediaId = asset.id;
        withImage++;
      } catch (e) {
        console.warn(
          `Row ${rowIdx}: image upload failed (${(e as Error).message}) — creating question without image.`,
        );
      }
    }

    const difficulty = difficultyFor(stem);
    const qType: QuestionType = primaryMediaId ? 'IMAGE' : 'TEXT';
    const title = stem.length > 80 ? `${stem.slice(0, 77)}…` : stem;

    await prisma.question.create({
      data: {
        title,
        stemMarkdown: stem,
        type: qType,
        answerType: 'SINGLE',
        difficulty,
        categoryId: category.id,
        primaryMediaId,
        ticketNumber: nextTicket++,
        isActive: true,
        timeLimitSeconds: timerFor(difficulty),
        createdById: creator?.id ?? null,
        tags: ['imported', 'ship-trivia'],
        options: {
          create: options.map((text, i) => ({
            orderIndex: i,
            textMarkdown: text,
            isCorrect: i === correctIndex,
          })),
        },
      },
    });
    existingStems.add(normalizeStem(stem));
    imported++;
  }

  console.log(
    `✅ Imported ${imported}, skipped ${skipped} duplicates, attached ${withImage} images.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
