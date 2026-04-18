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

  // Assign ticket numbers to any question that doesn't have one yet.
  const maxExisting =
    (await prisma.question.aggregate({ _max: { ticketNumber: true } }))._max
      .ticketNumber ?? 0;
  const withoutNumber = await prisma.question.findMany({
    where: { ticketNumber: null },
    orderBy: { createdAt: 'asc' },
  });
  let next = maxExisting + 1;
  for (const q of withoutNumber) {
    await prisma.question.update({
      where: { id: q.id },
      data: { ticketNumber: next++ },
    });
  }

  // --- Result templates --- pool of randomized copy so two visitors
  // rarely see the same message back to back.
  const hoorays = [
    {
      key: 'HOORAY_DEFAULT',
      headline: 'Hooray! Course set true ⚓',
      body: "You've navigated this one perfectly. A true naval architect's eye — steady as she goes!",
    },
    {
      key: 'HOORAY_01',
      headline: 'Smooth sailing, captain! 🧭',
      body: 'A sharp read of the tide. The brass medal is yours.',
    },
    {
      key: 'HOORAY_02',
      headline: 'Fair winds, true answer! ⛵',
      body: 'Your compass holds steady where others drift. Well chart-ed.',
    },
    {
      key: 'HOORAY_03',
      headline: 'Right on the waterline 🌊',
      body: 'A bullseye on the bulwarks. The dockmaster tips their cap.',
    },
    {
      key: 'HOORAY_04',
      headline: 'Deckhand to first mate 🎖️',
      body: "That's the kind of call a seasoned skipper makes. Onwards!",
    },
  ];
  const fails = [
    {
      key: 'FAIL_DEFAULT',
      headline: 'Rough seas today 🌊',
      body: 'Every captain learns the charts. The tide turns — come back and try again.',
    },
    {
      key: 'FAIL_01',
      headline: 'Missed the buoy this time 🛟',
      body: 'The currents were tricky. Chart your course and have another go.',
    },
    {
      key: 'FAIL_02',
      headline: 'Off the shipping lane ⚓',
      body: 'Even the best navigators re-plot. The harbour awaits your return.',
    },
    {
      key: 'FAIL_03',
      headline: 'A little off the waterline 🌫️',
      body: 'Fog can hide the right heading. Clear skies next time.',
    },
    {
      key: 'FAIL_04',
      headline: 'The horizon moved on you ⛴️',
      body: 'No captain is born at sea. Come back for another sighting.',
    },
  ];
  for (const t of hoorays) {
    await prisma.resultTemplate.upsert({
      where: { key: t.key },
      update: { headline: t.headline, bodyMarkdown: t.body, isActive: true },
      create: {
        key: t.key,
        headline: t.headline,
        bodyMarkdown: t.body,
        isActive: true,
      },
    });
  }
  for (const t of fails) {
    await prisma.resultTemplate.upsert({
      where: { key: t.key },
      update: { headline: t.headline, bodyMarkdown: t.body, isActive: true },
      create: {
        key: t.key,
        headline: t.headline,
        bodyMarkdown: t.body,
        revealCorrectOnFail: false,
        isActive: true,
      },
    });
  }

  // --- App settings ---
  const settings: { key: string; value: unknown; type: string }[] = [
    { key: 'otp.length', value: 6, type: 'int' },
    { key: 'otp.expiry_seconds', value: 300, type: 'int' },
    { key: 'otp.max_resends_per_15m', value: 3, type: 'int' },
    { key: 'captcha.enabled', value: false, type: 'bool' },
    { key: 'captcha.type', value: 'ARITHMETIC', type: 'enum' },
    { key: 'attempt.policy', value: 'UNLIMITED', type: 'enum' },
    { key: 'event.kiosk_mode', value: true, type: 'bool' },
    { key: 'event.collect_mobile', value: true, type: 'bool' },
    { key: 'event.auto_reset_seconds', value: 10, type: 'int' },
    { key: 'event.booth_name', value: 'OceanDraft · Event booth', type: 'string' },
    { key: 'assignment.mode', value: 'ONE_TIME_USE_POOL', type: 'enum' },
    { key: 'result.reveal_correct_on_fail', value: false, type: 'bool' },
    { key: 'branding.product_name', value: 'OceanDraft', type: 'string' },
    { key: 'privacy.policy_url', value: 'https://example.com/privacy', type: 'url' },
  ];
  // Keys whose defaults we actively re-align on every seed (event-mode reshape).
  const forceReset = new Set([
    'attempt.policy',
    'assignment.mode',
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
