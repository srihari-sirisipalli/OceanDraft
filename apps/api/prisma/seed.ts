/* eslint-disable no-console */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'question:create',
  'question:update',
  'question:delete',
  'question:read',
  'category:manage',
  'attempt:read',
  'attempt:unmask',
  'attempt:reset',
  'settings:read',
  'settings:update',
  'audit:read',
  'export:create',
  'media:manage',
  'admin:manage',
];

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((p) => !['admin:manage'].includes(p)),
  OPS: ['question:read', 'attempt:read', 'settings:read'],
  AUDITOR: ['question:read', 'attempt:read', 'audit:read', 'export:create'],
};

async function main() {
  console.log('🌊 OceanDraft seed starting...');

  // --- Permissions ---
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  // --- Roles ---
  for (const name of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
  }

  // --- Role-permission mappings ---
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName as AdminRole } });
    if (!role) continue;
    for (const permKey of perms) {
      const perm = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // --- Default admin ---
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@oceandraft.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123456';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: { username, email, passwordHash, isActive: true },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.adminUserRole.upsert({
      where: { adminUserId_roleId: { adminUserId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { adminUserId: admin.id, roleId: superAdminRole.id },
    });
  }

  // --- Categories ---
  const categories = [
    { name: 'Ship Stability', slug: 'ship-stability' },
    { name: 'Propulsion', slug: 'propulsion' },
    { name: 'Marine Safety', slug: 'marine-safety' },
    { name: 'Hull Design', slug: 'hull-design' },
    { name: 'General Naval Architecture', slug: 'general-na' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  const stability = await prisma.category.findUnique({ where: { slug: 'ship-stability' } });
  const propulsion = await prisma.category.findUnique({ where: { slug: 'propulsion' } });
  const safety = await prisma.category.findUnique({ where: { slug: 'marine-safety' } });
  const hull = await prisma.category.findUnique({ where: { slug: 'hull-design' } });
  const general = await prisma.category.findUnique({ where: { slug: 'general-na' } });

  // --- Sample questions ---
  type SeedQ = {
    title: string;
    stem: string;
    categoryId: string;
    options: { text: string; correct?: boolean }[];
    tags?: string[];
  };

  const samples: SeedQ[] = [
    {
      title: 'Metacentric height',
      stem: 'What does the metacentric height (GM) primarily indicate about a ship?',
      categoryId: stability!.id,
      options: [
        { text: 'Propeller efficiency' },
        { text: "Ship's initial transverse stability", correct: true },
        { text: 'Fuel consumption' },
        { text: 'Hull fouling rate' },
      ],
      tags: ['stability', 'gm'],
    },
    {
      title: 'GZ curve',
      stem: 'Which curve plots the righting arm against the angle of heel?',
      categoryId: stability!.id,
      options: [
        { text: 'Bonjean curve' },
        { text: 'GZ curve', correct: true },
        { text: 'Froude curve' },
        { text: 'Load line curve' },
      ],
      tags: ['stability', 'gz'],
    },
    {
      title: 'Bilge keels',
      stem: 'What is the primary purpose of bilge keels on a ship?',
      categoryId: stability!.id,
      options: [
        { text: 'Increase service speed' },
        { text: 'Damp rolling motion', correct: true },
        { text: 'Cool the engine room' },
        { text: 'Provide cathodic protection' },
      ],
      tags: ['stability', 'roll-damping'],
    },
    {
      title: 'SOLAS',
      stem: 'In maritime safety, SOLAS stands for:',
      categoryId: safety!.id,
      options: [
        { text: 'Safety of Life at Sea', correct: true },
        { text: 'Ship Oil & Liquid Assay System' },
        { text: 'Sea Operations & Landing Accords' },
        { text: 'Ship Owners Liability Assurance Scheme' },
      ],
      tags: ['imo', 'solas'],
    },
    {
      title: 'Cavitation',
      stem: 'Cavitation on a propeller is primarily caused by:',
      categoryId: propulsion!.id,
      options: [
        { text: 'Low local pressure forming vapour bubbles', correct: true },
        { text: 'Excessive cathodic protection' },
        { text: 'Salt-water chemistry alone' },
        { text: 'Shaft misalignment only' },
      ],
      tags: ['propulsion', 'cavitation'],
    },
    {
      title: 'Block coefficient',
      stem: 'The block coefficient (Cb) of a ship is the ratio of:',
      categoryId: hull!.id,
      options: [
        {
          text: 'Displaced volume to the volume of its circumscribing box (L × B × T)',
          correct: true,
        },
        { text: 'Waterplane area to L × B' },
        { text: 'Midship section area to B × T' },
        { text: 'Length between perpendiculars to beam' },
      ],
      tags: ['hull', 'coefficients'],
    },
    {
      title: 'Froude number',
      stem: 'The Froude number is used primarily to analyse:',
      categoryId: general!.id,
      options: [
        { text: 'Wave-making resistance and dynamic similarity', correct: true },
        { text: 'Viscous friction only' },
        { text: 'Electrochemical corrosion' },
        { text: 'Crew workload ratings' },
      ],
      tags: ['resistance', 'dimensionless'],
    },
  ];

  for (const q of samples) {
    const existing = await prisma.question.findFirst({ where: { title: q.title } });
    if (existing) continue;
    await prisma.question.create({
      data: {
        title: q.title,
        stemMarkdown: q.stem,
        type: 'TEXT',
        difficulty: 'MEDIUM',
        categoryId: q.categoryId,
        tags: q.tags ?? [],
        createdById: admin.id,
        isActive: true,
        options: {
          create: q.options.map((o, i) => ({
            orderIndex: i,
            textMarkdown: o.text,
            isCorrect: !!o.correct,
          })),
        },
      },
    });
  }

  // --- Result templates ---
  await prisma.resultTemplate.upsert({
    where: { key: 'HOORAY_DEFAULT' },
    update: {},
    create: {
      key: 'HOORAY_DEFAULT',
      headline: 'Hooray! Course set true ⚓',
      bodyMarkdown:
        "You've navigated this one perfectly. A true naval architect's eye — steady as she goes!",
      isActive: true,
    },
  });
  await prisma.resultTemplate.upsert({
    where: { key: 'FAIL_DEFAULT' },
    update: {},
    create: {
      key: 'FAIL_DEFAULT',
      headline: 'Rough seas today 🌊',
      bodyMarkdown:
        'Every captain learns the charts. The tide turns — come back and try again when the winds are fair.',
      revealCorrectOnFail: false,
      isActive: true,
    },
  });

  // --- App settings ---
  const settings: { key: string; value: unknown; type: string }[] = [
    { key: 'otp.length', value: 6, type: 'int' },
    { key: 'otp.expiry_seconds', value: 300, type: 'int' },
    { key: 'otp.max_resends_per_15m', value: 3, type: 'int' },
    { key: 'captcha.enabled', value: false, type: 'bool' },
    { key: 'captcha.type', value: 'ARITHMETIC', type: 'enum' },
    { key: 'attempt.policy', value: 'UNLIMITED', type: 'enum' },
    { key: 'event.kiosk_mode', value: true, type: 'bool' },
    { key: 'event.collect_mobile', value: false, type: 'bool' },
    { key: 'event.auto_reset_seconds', value: 10, type: 'int' },
    { key: 'event.booth_name', value: 'OceanDraft · Event booth', type: 'string' },
    { key: 'assignment.mode', value: 'RANDOM_ACTIVE', type: 'enum' },
    { key: 'result.reveal_correct_on_fail', value: false, type: 'bool' },
    { key: 'branding.product_name', value: 'OceanDraft', type: 'string' },
    { key: 'privacy.policy_url', value: 'https://example.com/privacy', type: 'url' },
  ];
  // Keys whose defaults we actively re-align on every seed (event-mode reshape).
  const forceReset = new Set([
    'attempt.policy',
    'event.kiosk_mode',
    'event.collect_mobile',
    'event.auto_reset_seconds',
    'event.booth_name',
  ]);
  for (const s of settings) {
    const force = forceReset.has(s.key);
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: force ? { valueJson: s.value as never, type: s.type } : {},
      create: { key: s.key, valueJson: s.value as never, type: s.type },
    });
  }

  console.log('✅ Seed complete.');
  console.log(`   Admin username: ${username}`);
  console.log(`   Admin password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
