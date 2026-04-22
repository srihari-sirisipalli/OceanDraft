/* eslint-disable no-console */
import { PrismaClient, AdminRole, AnswerType, QuestionDifficulty, QuestionType } from '@prisma/client';
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

  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const name of Object.keys(ROLE_PERMISSIONS) as AdminRole[]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
  }
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

  const categories = [
    { name: 'Ship Stability', slug: 'ship-stability' },
    { name: 'Propulsion', slug: 'propulsion' },
    { name: 'Marine Safety', slug: 'marine-safety' },
    { name: 'Hull Design', slug: 'hull-design' },
    { name: 'General Naval Architecture', slug: 'general-na' },
    { name: 'Navigation', slug: 'navigation' },
    { name: 'Marine Engineering', slug: 'marine-engineering' },
    { name: 'Ship Construction', slug: 'ship-construction' },
    { name: 'Cargo & Deck', slug: 'cargo-deck' },
    { name: 'Maritime Law & IMO', slug: 'maritime-law' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const catBySlug = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c]),
  );

  type SeedQ = {
    title: string;
    stem: string;
    slug: string;
    options: { text: string; correct?: boolean }[];
    answerType?: AnswerType;
    type?: QuestionType;
    difficulty?: QuestionDifficulty;
    timeLimitSeconds?: number | null;
    tags?: string[];
  };

  const timerFor = (d: QuestionDifficulty, multi?: boolean) => {
    const base = d === 'EASY' ? 45 : d === 'HARD' ? 25 : 35;
    return base + (multi ? 20 : 0);
  };

  const questions: SeedQ[] = [
    // SHIP STABILITY
    { title: 'Metacentric height', stem: 'What does the metacentric height (**GM**) primarily indicate?', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'Propeller efficiency' }, { text: "Ship's initial transverse stability", correct: true }, { text: 'Fuel consumption' }, { text: 'Hull fouling rate' } ] },
    { title: 'GZ curve', stem: 'Which curve plots the righting arm against the angle of heel?', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'Bonjean curve' }, { text: 'GZ curve', correct: true }, { text: 'Froude curve' }, { text: 'Load line curve' } ] },
    { title: 'Bilge keels', stem: 'What is the primary purpose of bilge keels?', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'Increase service speed' }, { text: 'Damp rolling motion', correct: true }, { text: 'Cool the engine room' }, { text: 'Cathodic protection' } ] },
    { title: 'Free-surface effect', stem: 'The free-surface effect in partially-filled tanks usually:', slug: 'ship-stability', difficulty: 'MEDIUM', options: [ { text: 'Improves stability' }, { text: 'Virtually reduces GM', correct: true }, { text: 'Has no effect' }, { text: 'Adds to dead-weight' } ] },
    { title: 'Angle of loll', stem: 'An angle of loll indicates:', slug: 'ship-stability', difficulty: 'MEDIUM', options: [ { text: 'A stable equilibrium at the upright position' }, { text: 'Negative initial GM with equilibrium at a heel angle', correct: true }, { text: 'Heavy weather rolling' }, { text: 'Capsized condition' } ] },
    { title: 'KB, BM, KM relationships', stem: 'Choose all TRUE relationships (small angles of heel).', slug: 'ship-stability', difficulty: 'HARD', answerType: 'MULTI', options: [ { text: 'KM = KB + BM', correct: true }, { text: 'GM = KM − KG', correct: true }, { text: 'BM = I_T / ∇', correct: true }, { text: 'GZ = GM × cosθ' } ] },
    { title: 'Range of stability', stem: 'Range of stability refers to:', slug: 'ship-stability', difficulty: 'MEDIUM', options: [ { text: 'Heel angles over which GZ remains positive', correct: true }, { text: 'Number of watertight compartments' }, { text: 'Maximum speed in still water' }, { text: 'Height of M above keel' } ] },
    { title: 'Intact vs damage stability', stem: 'Damage stability criteria typically require:', slug: 'ship-stability', difficulty: 'HARD', options: [ { text: 'GZ analysis in the upright, undamaged state' }, { text: 'Residual stability after flooding of specified compartments', correct: true }, { text: 'Only reserve buoyancy amidships' }, { text: 'Removal of all transverse bulkheads' } ] },
    { title: 'Cross curves of stability', stem: 'Cross curves plot:', slug: 'ship-stability', difficulty: 'HARD', options: [ { text: 'KN vs displacement at constant heel angles', correct: true }, { text: 'Froude vs resistance' }, { text: 'Wave-making coefficients' }, { text: 'Shear vs bending moment' } ] },
    { title: 'Roll period', stem: "Natural roll period ∝", slug: 'ship-stability', difficulty: 'MEDIUM', options: [ { text: '1 / √GM', correct: true }, { text: 'Displacement²' }, { text: 'Block coefficient' }, { text: 'Freeboard' } ] },
    { title: 'Small-angle righting lever', stem: 'For small angles of heel, GZ ≈', slug: 'ship-stability', difficulty: 'MEDIUM', options: [ { text: 'GM × sin θ', correct: true }, { text: 'KB × cos θ' }, { text: 'BM × θ²' }, { text: 'KG × tan θ' } ] },
    { title: 'Inclining experiment', stem: 'Which are recorded during an inclining experiment?', slug: 'ship-stability', difficulty: 'HARD', answerType: 'MULTI', options: [ { text: 'Fore and aft drafts', correct: true }, { text: 'Pendulum deflection', correct: true }, { text: 'Known mass shifted transversely', correct: true }, { text: 'Propeller slip ratio' } ] },
    { title: 'Plimsoll mark', stem: 'The Plimsoll mark relates primarily to:', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'Minimum allowable freeboard', correct: true }, { text: 'Engine exhaust height' }, { text: 'Drill frequency' }, { text: 'Paint coating thickness' } ] },
    { title: 'Effect of adding weight high', stem: 'Adding weight high above the centre of gravity will usually:', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'Increase GM' }, { text: 'Decrease GM', correct: true }, { text: 'No effect on GM' }, { text: 'Increase displacement only' } ] },
    { title: 'List vs heel', stem: 'List differs from heel in that list is:', slug: 'ship-stability', difficulty: 'EASY', options: [ { text: 'A permanent transverse inclination due to internal causes', correct: true }, { text: 'A rolling motion induced by waves' }, { text: 'A longitudinal trim change' }, { text: 'Angle measured from forecastle deck' } ] },

    // PROPULSION
    { title: 'Cavitation', stem: 'Cavitation on a propeller is primarily caused by:', slug: 'propulsion', difficulty: 'MEDIUM', options: [ { text: 'Low local pressure forming vapour bubbles', correct: true }, { text: 'Excessive cathodic protection' }, { text: 'Salt-water chemistry alone' }, { text: 'Shaft misalignment only' } ] },
    { title: 'Taylor wake fraction', stem: 'w_T ≈', slug: 'propulsion', difficulty: 'MEDIUM', options: [ { text: '(V_ship − V_advance) / V_ship', correct: true }, { text: 'V_advance / V_ship' }, { text: '1 − thrust deduction' }, { text: 'RPM / pitch' } ] },
    { title: 'Pitch ratio', stem: 'Propeller pitch ratio = pitch / ?', slug: 'propulsion', difficulty: 'EASY', options: [ { text: 'Diameter', correct: true }, { text: 'RPM' }, { text: 'Blade area' }, { text: 'Disc area' } ] },
    { title: 'CPP advantage', stem: 'Controllable pitch propellers (CPP) allow:', slug: 'propulsion', difficulty: 'EASY', options: [ { text: 'Continuous adjustment of thrust without changing RPM', correct: true }, { text: 'Complete elimination of cavitation' }, { text: 'Higher fuel consumption at cruise only' }, { text: 'Removal of the reduction gearbox' } ] },
    { title: 'Bollard pull', stem: 'Bollard pull is measured when the ship is:', slug: 'propulsion', difficulty: 'EASY', options: [ { text: 'Stationary, at full power', correct: true }, { text: 'At trial speed' }, { text: 'In drydock' }, { text: 'At max rudder' } ] },
    { title: 'SHP / IHP', stem: 'The ratio SHP / IHP represents:', slug: 'propulsion', difficulty: 'HARD', options: [ { text: 'Mechanical efficiency of the engine', correct: true }, { text: 'Propulsive efficiency only' }, { text: 'Hull efficiency' }, { text: 'Transmission loss to the rudder' } ] },
    { title: 'Bow thruster purpose', stem: 'Bow thrusters are used primarily for:', slug: 'propulsion', difficulty: 'EASY', options: [ { text: 'Low-speed manoeuvring', correct: true }, { text: 'Long-distance passage' }, { text: 'Replacing main propeller' }, { text: 'Increasing top speed' } ] },
    { title: 'Azimuth thrusters — pick all', stem: 'Characteristics of azimuth thrusters:', slug: 'propulsion', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Rotate 360° to direct thrust', correct: true }, { text: 'Often remove the need for a rudder', correct: true }, { text: 'Used on DP-capable vessels', correct: true }, { text: 'Run only on steam power' } ] },
    { title: 'Specific fuel consumption', stem: 'SFC is expressed in:', slug: 'propulsion', difficulty: 'MEDIUM', options: [ { text: 'g / kWh', correct: true }, { text: 'kg / NM' }, { text: 'V / A' }, { text: 'knots / h' } ] },
    { title: 'Apparent slip', stem: 'Apparent slip is:', slug: 'propulsion', difficulty: 'MEDIUM', options: [ { text: '(Theoretical − Observed) / Theoretical speed', correct: true }, { text: 'Distance per minute' }, { text: 'Wake fraction' }, { text: 'Blade pitch error' } ] },
    { title: 'Thrust deduction', stem: 'Thrust deduction fraction accounts for:', slug: 'propulsion', difficulty: 'HARD', options: [ { text: 'Propeller suction reducing hull pressure and increasing resistance', correct: true }, { text: 'Wake effect on advance speed' }, { text: 'Engine torque loss in gearbox' }, { text: 'Rudder drag' } ] },
    { title: 'Kort nozzles', stem: 'Kort nozzles improve thrust chiefly at:', slug: 'propulsion', difficulty: 'MEDIUM', options: [ { text: 'Low speed, high-load (towing)', correct: true }, { text: 'High-speed free running' }, { text: 'Reversed flow only' }, { text: 'Sailing downwind' } ] },

    // MARINE SAFETY
    { title: 'SOLAS', stem: 'SOLAS stands for:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Safety of Life at Sea', correct: true }, { text: 'Ship Oil & Liquid Assay System' }, { text: 'Sea Operations & Landing Accords' }, { text: 'Ship Owners Liability Assurance Scheme' } ] },
    { title: 'MARPOL Annex I', stem: 'MARPOL Annex I deals with:', slug: 'marine-safety', difficulty: 'MEDIUM', options: [ { text: 'Prevention of pollution by oil', correct: true }, { text: 'Garbage management' }, { text: 'Air pollution' }, { text: 'Noxious liquid substances' } ] },
    { title: 'GMDSS', stem: 'GMDSS is the:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Global Maritime Distress and Safety System', correct: true }, { text: 'General Maritime Discharge Standard System' }, { text: 'Gulf Maritime Defence Signalling System' }, { text: 'Greater Mediterranean Drift Survey' } ] },
    { title: 'Lifeboat drills (SOLAS)', stem: 'Under SOLAS, lifeboat drills are typically held at least:', slug: 'marine-safety', difficulty: 'MEDIUM', options: [ { text: 'Once a month', correct: true }, { text: 'Once a year' }, { text: 'Every voyage' }, { text: 'Only before first departure' } ] },
    { title: 'Damage stability — pick all', stem: 'Required SOLAS damage-stability concepts:', slug: 'marine-safety', difficulty: 'HARD', answerType: 'MULTI', options: [ { text: 'Residual freeboard after flooding', correct: true }, { text: 'Probabilistic index A ≥ R', correct: true }, { text: 'Final equilibrium within regulated heel', correct: true }, { text: 'Mandatory doubling of all bulkheads' } ] },
    { title: 'EPIRB function', stem: 'An EPIRB primarily transmits:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Distress signal with position to COSPAS-SARSAT', correct: true }, { text: 'Routine ETA updates' }, { text: 'Chart corrections' }, { text: 'Crew medical records' } ] },
    { title: 'IMDG Code', stem: 'The IMDG Code concerns:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Carriage of dangerous goods by sea', correct: true }, { text: 'Seafarer rest hours' }, { text: 'Ballast water exchange' }, { text: 'Underwater noise' } ] },
    { title: 'MOB recovery — pick all', stem: 'Equipment associated with MOB recovery:', slug: 'marine-safety', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Dan buoy / smoke marker', correct: true }, { text: 'Rescue boat', correct: true }, { text: 'Williamson turn capability', correct: true }, { text: 'Chain locker' } ] },
    { title: 'Fixed CO₂ system', stem: 'Fixed CO₂ flooding is typically used for:', slug: 'marine-safety', difficulty: 'MEDIUM', options: [ { text: 'Engine room fire suppression', correct: true }, { text: 'Drinking-water treatment' }, { text: 'Bilge de-oiling' }, { text: 'Ballast conditioning' } ] },
    { title: 'Fire triangle', stem: 'Three elements of the fire triangle:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Heat, fuel, oxygen', correct: true }, { text: 'Water, wind, salt' }, { text: 'Pressure, flow, density' }, { text: 'Torque, thrust, RPM' } ] },
    { title: 'ISPS Code', stem: 'The ISPS Code addresses:', slug: 'marine-safety', difficulty: 'MEDIUM', options: [ { text: 'Ship and port facility security', correct: true }, { text: 'Intact stability parameters' }, { text: 'Pilotage procedures' }, { text: 'Signalling lamp maintenance' } ] },
    { title: 'Enclosed space entry', stem: 'Before entering an enclosed space, always:', slug: 'marine-safety', difficulty: 'EASY', options: [ { text: 'Test atmosphere and ventilate; use permit-to-work', correct: true }, { text: 'Plug your ears' }, { text: 'Remove all PPE' }, { text: 'Rely solely on smell' } ] },

    // HULL DESIGN
    { title: 'Block coefficient', stem: 'C_b is the ratio of:', slug: 'hull-design', difficulty: 'EASY', options: [ { text: 'Displaced volume to (L × B × T)', correct: true }, { text: 'A_wp / (L × B)' }, { text: 'A_m / (B × T)' }, { text: 'L_pp / beam' } ] },
    { title: 'Prismatic coefficient', stem: 'C_p ≈', slug: 'hull-design', difficulty: 'MEDIUM', options: [ { text: 'Displaced volume / (A_m × L)', correct: true }, { text: 'C_b × C_wp' }, { text: 'L / B' }, { text: 'B / T' } ] },
    { title: 'Waterplane coefficient', stem: 'C_wp =', slug: 'hull-design', difficulty: 'MEDIUM', options: [ { text: 'A_wp / (L × B)', correct: true }, { text: '∇ / (L × B × T)' }, { text: 'A_m / (B × T)' }, { text: 'L / T' } ] },
    { title: 'Bulbous bow', stem: 'A bulbous bow reduces:', slug: 'hull-design', difficulty: 'EASY', options: [ { text: 'Wave-making resistance at design speed', correct: true }, { text: 'Ballast volume' }, { text: 'Propeller diameter' }, { text: 'Side thrust in turning' } ] },
    { title: 'LCB vs LCG', stem: 'For static equilibrium in still water:', slug: 'hull-design', difficulty: 'MEDIUM', options: [ { text: 'LCB must be in same vertical line as LCG', correct: true }, { text: 'LCG forward of LCB by at least 1 m' }, { text: 'LCB always amidships' }, { text: 'LCG and LCB can be anywhere' } ] },
    { title: 'Gross tonnage', stem: 'Gross tonnage measures:', slug: 'hull-design', difficulty: 'EASY', options: [ { text: 'Total enclosed volume of the ship', correct: true }, { text: 'Cargo weight' }, { text: 'Engine power output' }, { text: 'Registered draught' } ] },
    { title: 'Hull form statements — pick all', stem: 'Select correct statements:', slug: 'hull-design', difficulty: 'HARD', answerType: 'MULTI', options: [ { text: 'Full forms have high C_b (~0.8+)', correct: true }, { text: 'Fine hulls → low C_b and low C_p', correct: true }, { text: 'Tankers have higher C_b than containerships', correct: true }, { text: 'C_b has no relation to wave-making resistance' } ] },
    { title: 'Sheer', stem: 'Sheer refers to:', slug: 'hull-design', difficulty: 'EASY', options: [ { text: 'Fore-aft curvature of the deck above amidships', correct: true }, { text: 'Transverse curvature of midship section' }, { text: 'Longitudinal C_p' }, { text: 'Camber of keel' } ] },
    { title: 'Flare', stem: 'Flare at the bow:', slug: 'hull-design', difficulty: 'MEDIUM', options: [ { text: 'Widens hull outwards above waterline', correct: true }, { text: 'Narrows hull above waterline' }, { text: 'Lowers the keel' }, { text: 'Applies only to submarines' } ] },
    { title: 'Midship section coefficient', stem: 'C_m =', slug: 'hull-design', difficulty: 'MEDIUM', options: [ { text: 'A_m / (B × T)', correct: true }, { text: 'A_wp / (L × B)' }, { text: 'V / (L × B × T)' }, { text: 'L / B' } ] },

    // GENERAL NA
    { title: 'Froude number', stem: 'Froude number is used primarily to analyse:', slug: 'general-na', difficulty: 'EASY', options: [ { text: 'Wave-making resistance & dynamic similarity', correct: true }, { text: 'Viscous friction only' }, { text: 'Electrochemical corrosion' }, { text: 'Crew workload ratings' } ] },
    { title: 'Reynolds number', stem: 'Re is the ratio of:', slug: 'general-na', difficulty: 'MEDIUM', options: [ { text: 'Inertial to viscous forces', correct: true }, { text: 'Weight to buoyancy' }, { text: 'Pressure to density' }, { text: 'Thrust to drag' } ] },
    { title: 'Archimedes', stem: 'A floating ship displaces a volume of water whose weight equals:', slug: 'general-na', difficulty: 'EASY', options: [ { text: "Ship's own total weight", correct: true }, { text: 'Half of its dead-weight' }, { text: 'GT × draft' }, { text: 'Cargo weight only' } ] },
    { title: 'Lightship', stem: 'Lightship weight includes:', slug: 'general-na', difficulty: 'MEDIUM', options: [ { text: 'Structure, machinery, outfit; not cargo/fuel/crew', correct: true }, { text: 'Cargo only' }, { text: 'Fuel and cargo' }, { text: 'Ballast water' } ] },
    { title: 'Resistance components — pick all', stem: 'Major components of calm-water resistance:', slug: 'general-na', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Frictional (viscous)', correct: true }, { text: 'Wave-making', correct: true }, { text: 'Air resistance', correct: true }, { text: 'Magnetic compass drag' } ] },
    { title: 'Shallow-water squat', stem: 'Sinkage in shallow water is mostly due to:', slug: 'general-na', difficulty: 'HARD', options: [ { text: 'Bernoulli suction between hull and seabed', correct: true }, { text: 'Wind drag' }, { text: 'Propeller thrust' }, { text: 'Solar heating' } ] },
    { title: 'Hydrostatic curves', stem: 'Hydrostatic curves typically show:', slug: 'general-na', difficulty: 'MEDIUM', options: [ { text: 'Displacement, KB, BM_T, TPC, MCT1cm vs draft', correct: true }, { text: 'Wave height vs wind speed' }, { text: 'RPM vs SFC' }, { text: 'Roll angle vs time' } ] },
    { title: 'LBP', stem: 'L_pp is measured:', slug: 'general-na', difficulty: 'EASY', options: [ { text: 'Between forward and aft perpendiculars at design draft', correct: true }, { text: 'From bulbous bow to transom' }, { text: 'Around the hull' }, { text: 'Funnel to mast' } ] },
    { title: 'TPC', stem: 'TPC stands for:', slug: 'general-na', difficulty: 'MEDIUM', options: [ { text: 'Tonnes per centimetre immersion', correct: true }, { text: 'Torque per cylinder' }, { text: 'Total passenger capacity' }, { text: 'Turn per chain' } ] },
    { title: 'MCT 1cm', stem: 'MCT 1cm is the:', slug: 'general-na', difficulty: 'HARD', options: [ { text: 'Moment to change trim by 1 cm', correct: true }, { text: 'Max cargo transfer in 1 cycle' }, { text: 'Min crew training under 1 year' }, { text: 'Moment coefficient at 1 radian' } ] },

    // NAVIGATION
    { title: 'DGPS', stem: 'DGPS improves GPS by:', slug: 'navigation', difficulty: 'MEDIUM', options: [ { text: 'Applying differential corrections from reference stations', correct: true }, { text: 'Doubling satellite count' }, { text: 'Using only encrypted signals' }, { text: 'Removing the ionosphere' } ] },
    { title: 'Magnetic variation', stem: 'Variation is the angle between:', slug: 'navigation', difficulty: 'EASY', options: [ { text: 'True north and magnetic north at a point', correct: true }, { text: 'Grid north and true north' }, { text: 'Heading and COG' }, { text: 'Gyro and fluxgate compasses' } ] },
    { title: 'Compass deviation', stem: 'Compass deviation is caused by:', slug: 'navigation', difficulty: 'MEDIUM', options: [ { text: "Ship's own magnetic field affecting the compass", correct: true }, { text: 'Tides' }, { text: 'Ionospheric reflection' }, { text: 'Wind gusts' } ] },
    { title: 'ECDIS', stem: 'ECDIS is a:', slug: 'navigation', difficulty: 'EASY', options: [ { text: 'Electronic Chart Display and Information System', correct: true }, { text: 'Engine Control Data Integration Server' }, { text: 'Emergency Crew Distress Information Setup' }, { text: 'Environmental Cargo Discharge Indicator' } ] },
    { title: 'AIS data — pick all', stem: 'AIS transmits which of the following?', slug: 'navigation', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Ship identity (MMSI)', correct: true }, { text: 'Position, course and speed', correct: true }, { text: 'Cargo type and destination', correct: true }, { text: 'Crew passport scans' } ] },
    { title: 'Sea clutter', stem: 'Sea clutter is typically reduced using:', slug: 'navigation', difficulty: 'MEDIUM', options: [ { text: 'Swept-gain (STC) control', correct: true }, { text: 'Parallel rulers' }, { text: 'Barometer adjustment' }, { text: 'Gyro reset' } ] },
    { title: 'Rhumb line', stem: 'A rhumb line is a path that crosses meridians at a:', slug: 'navigation', difficulty: 'MEDIUM', options: [ { text: 'Constant angle', correct: true }, { text: 'Right angle' }, { text: 'Randomly varying angle' }, { text: 'Zero angle' } ] },
    { title: 'Great-circle', stem: 'Great-circle routes are preferred on:', slug: 'navigation', difficulty: 'HARD', options: [ { text: 'Long ocean passages for shortest distance', correct: true }, { text: 'Coastal pilotage' }, { text: 'Harbour manoeuvring' }, { text: 'Riverine navigation' } ] },
    { title: 'IALA Region A', stem: 'In IALA Region A, port-hand marks are coloured:', slug: 'navigation', difficulty: 'EASY', options: [ { text: 'Red', correct: true }, { text: 'Green' }, { text: 'Yellow' }, { text: 'Black and red' } ] },
    { title: '1 min of latitude', stem: '1 minute of latitude ≈', slug: 'navigation', difficulty: 'MEDIUM', options: [ { text: '1 nautical mile', correct: true }, { text: '1 statute mile' }, { text: '1 km' }, { text: '10 m' } ] },

    // MARINE ENGINEERING
    { title: 'Low-speed engines', stem: 'Large main propulsion engines are typically:', slug: 'marine-engineering', difficulty: 'EASY', options: [ { text: 'Two-stroke crosshead engines', correct: true }, { text: 'Four-stroke V12 petrol' }, { text: 'Rotary Wankel' }, { text: 'Single-cylinder diesel' } ] },
    { title: 'Turbocharger', stem: 'Marine turbochargers primarily:', slug: 'marine-engineering', difficulty: 'EASY', options: [ { text: 'Increase mass of air into cylinders to raise power', correct: true }, { text: 'Filter lube oil' }, { text: 'Chill charge air only' }, { text: 'Generate electricity' } ] },
    { title: 'Heavy fuel oil', stem: 'HFO requires:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Heating for viscosity and purification before injection', correct: true }, { text: 'Direct injection at ambient temperature' }, { text: 'No filtration' }, { text: 'Mixing with sea water' } ] },
    { title: 'Boiler safety valve', stem: 'A boiler safety valve:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Relieves pressure above a set limit automatically', correct: true }, { text: 'Maintains low water level' }, { text: 'Controls feed water flow' }, { text: 'Opens during normal firing' } ] },
    { title: 'Fresh water generator', stem: 'Marine FWGs typically operate under:', slug: 'marine-engineering', difficulty: 'HARD', options: [ { text: 'Vacuum to lower boiling point of sea water', correct: true }, { text: 'High pressure to force evaporation' }, { text: 'Freezing conditions' }, { text: 'Atmospheric pressure without heating' } ] },
    { title: 'MARPOL Annex VI', stem: 'Annex VI regulates:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Air emissions (NOx, SOx, PM, CO₂)', correct: true }, { text: 'Bilge water' }, { text: 'Ballast water pathogens' }, { text: 'Crew leave entitlements' } ] },
    { title: 'Scrubber', stem: 'An exhaust-gas scrubber is used to:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Reduce SOx emissions by wash water', correct: true }, { text: 'Pre-heat fuel' }, { text: 'Pump ballast water' }, { text: 'Detect CO in cabins' } ] },
    { title: 'Shaft generator', stem: 'A shaft generator produces electricity by:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Taking mechanical power from the main propulsion shaft', correct: true }, { text: 'Running on diesel fuel' }, { text: 'Solar irradiation' }, { text: 'Wind turbines' } ] },
    { title: 'Fuel oil purifier', stem: 'Fuel oil purifiers remove:', slug: 'marine-engineering', difficulty: 'MEDIUM', options: [ { text: 'Water and solid impurities by centrifugal force', correct: true }, { text: 'Sulphur oxides' }, { text: 'NOx from exhaust' }, { text: 'Air from cylinders' } ] },
    { title: 'Hydrostatic test', stem: 'A hydrostatic pressure test checks:', slug: 'marine-engineering', difficulty: 'EASY', options: [ { text: 'Structural integrity and leakage of pressure-containing parts', correct: true }, { text: 'Paint thickness' }, { text: 'Propeller pitch' }, { text: 'Fuel octane' } ] },

    // SHIP CONSTRUCTION
    { title: 'Longitudinal framing', stem: 'Longitudinal framing is typical for:', slug: 'ship-construction', difficulty: 'MEDIUM', options: [ { text: 'Large tankers and bulk carriers', correct: true }, { text: 'Small pleasure craft' }, { text: 'Hovercraft' }, { text: 'Submarines only' } ] },
    { title: 'Double bottom', stem: 'Double-bottom tanks are primarily used for:', slug: 'ship-construction', difficulty: 'EASY', options: [ { text: 'Ballast, fuel or fresh water, and grounding protection', correct: true }, { text: 'Crew accommodation' }, { text: 'Bridge equipment storage' }, { text: 'Helicopter fuel only' } ] },
    { title: 'Keel types — pick all', stem: 'Which of the following are keel types?', slug: 'ship-construction', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Bar keel', correct: true }, { text: 'Duct keel', correct: true }, { text: 'Flat plate keel', correct: true }, { text: 'Bow thruster keel' } ] },
    { title: 'Watertight bulkheads', stem: 'SOLAS-compliant ships typically have watertight bulkheads at:', slug: 'ship-construction', difficulty: 'MEDIUM', options: [ { text: 'Forepeak, afterpeak, and regulated subdivision lengths', correct: true }, { text: 'Only the engine room' }, { text: 'Forepeak only' }, { text: 'Every frame' } ] },
    { title: 'Corrugated bulkhead', stem: 'Corrugated bulkheads are used to:', slug: 'ship-construction', difficulty: 'MEDIUM', options: [ { text: 'Increase stiffness while reducing weight and stiffeners', correct: true }, { text: 'Store cargo' }, { text: 'Dampen propeller vibration' }, { text: 'Improve paint colour' } ] },
    { title: 'Construction method', stem: 'Modern ocean-going ships are built primarily using:', slug: 'ship-construction', difficulty: 'EASY', options: [ { text: 'Welded steel construction', correct: true }, { text: 'Riveted wrought iron' }, { text: 'Wooden caravel planking' }, { text: 'Bolted composite sheets' } ] },
    { title: 'Classification societies', stem: 'Classification societies primarily provide:', slug: 'ship-construction', difficulty: 'EASY', options: [ { text: 'Rules, survey and certification of ship structures and systems', correct: true }, { text: 'Crew wage negotiations' }, { text: 'Cargo brokerage' }, { text: 'Port operations licensing' } ] },
    { title: 'Sheer strake', stem: 'The sheer strake is:', slug: 'ship-construction', difficulty: 'HARD', options: [ { text: 'The uppermost continuous plate strake at the strength deck edge', correct: true }, { text: 'The bottom centreline plate' }, { text: 'A transverse frame' }, { text: 'The rudder post' } ] },

    // CARGO & DECK
    { title: 'TEU', stem: 'TEU stands for:', slug: 'cargo-deck', difficulty: 'EASY', options: [ { text: 'Twenty-foot Equivalent Unit', correct: true }, { text: 'Total Engine Utilisation' }, { text: 'Tanker Energy Usage' }, { text: 'Transverse Equilibrium Unit' } ] },
    { title: 'Loadicator', stem: 'A loadicator is used to:', slug: 'cargo-deck', difficulty: 'MEDIUM', options: [ { text: 'Monitor longitudinal strength during loading/discharging', correct: true }, { text: 'Record wind speed' }, { text: 'Steer the ship' }, { text: 'Detect engine vibration' } ] },
    { title: 'Ullage', stem: 'Ullage in a tanker is the:', slug: 'cargo-deck', difficulty: 'MEDIUM', options: [ { text: 'Distance from liquid surface to the top of the tank', correct: true }, { text: 'Volume of cargo' }, { text: 'Density of the cargo' }, { text: 'Cleaning agent' } ] },
    { title: 'Dunnage', stem: 'Dunnage is used to:', slug: 'cargo-deck', difficulty: 'EASY', options: [ { text: 'Protect cargo from damage and help with stowage', correct: true }, { text: 'Carry fresh water' }, { text: 'Operate the anchor winch' }, { text: 'Store life jackets' } ] },
    { title: 'Lashing equipment — pick all', stem: 'Select valid containership lashing equipment:', slug: 'cargo-deck', difficulty: 'MEDIUM', answerType: 'MULTI', options: [ { text: 'Twist locks', correct: true }, { text: 'Lashing rods', correct: true }, { text: 'Turnbuckles', correct: true }, { text: 'Windlass brakes' } ] },
    { title: 'IMSBC Code', stem: 'The IMSBC Code governs:', slug: 'cargo-deck', difficulty: 'MEDIUM', options: [ { text: 'Safe carriage of solid bulk cargoes', correct: true }, { text: 'Liquefied gas carriage' }, { text: 'Reefer power supply' }, { text: 'Passenger embarkation' } ] },
    { title: 'Inert gas (IGS)', stem: 'IGS on oil tankers prevents:', slug: 'cargo-deck', difficulty: 'HARD', options: [ { text: 'Flammable atmospheres in cargo tanks', correct: true }, { text: 'Crew fatigue' }, { text: 'Bilge water overflow' }, { text: 'Boiler carry-over' } ] },
    { title: 'Reefer', stem: 'Reefer containers provide:', slug: 'cargo-deck', difficulty: 'EASY', options: [ { text: 'Temperature-controlled cargo transport', correct: true }, { text: 'Pressurised hydrogen transport' }, { text: 'Live animal stables' }, { text: 'Radar signal shielding' } ] },

    // MARITIME LAW / IMO
    { title: 'IMO', stem: 'The IMO is:', slug: 'maritime-law', difficulty: 'EASY', options: [ { text: 'UN agency responsible for shipping safety and pollution prevention', correct: true }, { text: 'A private classification society' }, { text: "A ship owners' cartel" }, { text: 'A fishery council' } ] },
    { title: 'Port State Control', stem: 'Port State Control inspections verify:', slug: 'maritime-law', difficulty: 'EASY', options: [ { text: 'Foreign-flagged ships comply with international conventions', correct: true }, { text: 'Harbour dues payment only' }, { text: 'Crew wage records only' }, { text: 'Fuel prices' } ] },
    { title: 'COLREGs narrow channel', stem: 'Rule 9 COLREGs: vessels in a narrow channel should:', slug: 'maritime-law', difficulty: 'MEDIUM', options: [ { text: 'Keep as near as safe to the outer limit on the starboard side', correct: true }, { text: 'Always alter course to port' }, { text: 'Stop engines when meeting another ship' }, { text: 'Drop anchor' } ] },
    { title: 'MLC 2006', stem: 'MLC 2006 is:', slug: 'maritime-law', difficulty: 'EASY', options: [ { text: 'The Maritime Labour Convention', correct: true }, { text: 'A propeller standard' }, { text: 'A radar regulation' }, { text: 'A cargo code' } ] },
    { title: 'Flag State', stem: "A ship's flag State is the country:", slug: 'maritime-law', difficulty: 'EASY', options: [ { text: 'Whose laws the ship is registered under', correct: true }, { text: 'Where built' }, { text: 'Where owner lives' }, { text: 'Where crew trained' } ] },
    { title: 'STCW', stem: 'STCW sets minimum standards for:', slug: 'maritime-law', difficulty: 'MEDIUM', options: [ { text: 'Training, certification and watchkeeping for seafarers', correct: true }, { text: 'Ship resistance calculations' }, { text: 'Hull paint composition' }, { text: 'Port tariffs' } ] },
    { title: 'UNCLOS zones — pick all', stem: 'Select zones defined by UNCLOS:', slug: 'maritime-law', difficulty: 'HARD', answerType: 'MULTI', options: [ { text: 'Territorial sea (12 NM)', correct: true }, { text: 'Contiguous zone (24 NM)', correct: true }, { text: 'Exclusive Economic Zone (200 NM)', correct: true }, { text: 'Commercial fishing lanes of any width' } ] },
    { title: 'Salvage — no cure, no pay', stem: 'The "no cure, no pay" principle is associated with:', slug: 'maritime-law', difficulty: 'MEDIUM', options: [ { text: "Traditional marine salvage contracts (Lloyd's Open Form)", correct: true }, { text: 'Bunker fuel purchases' }, { text: 'Crew medical insurance' }, { text: 'Chartered flights' } ] },
  ];

  for (const q of questions) {
    const cat = catBySlug[q.slug];
    if (!cat) continue;
    const existing = await prisma.question.findFirst({ where: { title: q.title } });
    if (existing) continue;
    const answerType: AnswerType = q.answerType ?? 'SINGLE';
    const difficulty: QuestionDifficulty = q.difficulty ?? 'MEDIUM';
    await prisma.question.create({
      data: {
        title: q.title,
        stemMarkdown: q.stem,
        type: q.type ?? 'TEXT',
        answerType,
        difficulty,
        categoryId: cat.id,
        tags: q.tags ?? [],
        createdById: admin.id,
        isActive: true,
        timeLimitSeconds:
          q.timeLimitSeconds === undefined
            ? timerFor(difficulty, answerType === 'MULTI')
            : q.timeLimitSeconds,
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

  const hoorays = [
    { key: 'HOORAY_DEFAULT', headline: 'Hooray! Course set true ⚓', body: "A true naval architect's eye — steady as she goes." },
    { key: 'HOORAY_01', headline: 'Smooth sailing, captain! 🧭', body: 'A sharp read of the tide. The brass medal is yours.' },
    { key: 'HOORAY_02', headline: 'Fair winds, true answer! ⛵', body: 'Your compass holds steady where others drift.' },
    { key: 'HOORAY_03', headline: 'Right on the waterline 🌊', body: 'A bullseye on the bulwarks.' },
    { key: 'HOORAY_04', headline: 'Deckhand to first mate 🎖️', body: "That's a seasoned skipper's call." },
    { key: 'HOORAY_05', headline: 'A true shipwright 🛠️', body: 'Strength, line and judgement — all in order.' },
    { key: 'HOORAY_06', headline: 'The horizon smiles 🌅', body: 'Course plotted, speed made good.' },
    { key: 'HOORAY_07', headline: 'Steady as she goes ⛴️', body: 'A fine hand on the wheel.' },
    { key: 'HOORAY_08', headline: 'Full ahead both! ⚡', body: 'Straight through like a fair breeze.' },
    { key: 'HOORAY_09', headline: 'Anchors aweigh 🎯', body: 'Nothing holding you back.' },
    { key: 'HOORAY_10', headline: 'Bravo Zulu! 🏅', body: 'A well-done in any fleet.' },
    { key: 'HOORAY_11', headline: 'Calm seas, true bearings 🧭', body: 'The charts agree with you.' },
    { key: 'HOORAY_12', headline: 'A proper mariner! 🐬', body: 'The dolphins approve.' },
    { key: 'HOORAY_13', headline: 'Hoist the colours! 🚩', body: 'Display your medal with pride.' },
    { key: 'HOORAY_14', headline: 'Navigation nailed it ✨', body: 'Every degree of heading spot on.' },
    { key: 'HOORAY_15', headline: 'Engine room cheers 🔧', body: 'A clean bill of health.' },
  ];
  const fails = [
    { key: 'FAIL_DEFAULT', headline: 'Rough seas today 🌊', body: 'Every captain learns the charts. Try again.' },
    { key: 'FAIL_01', headline: 'Missed the buoy this time 🛟', body: 'The currents were tricky.' },
    { key: 'FAIL_02', headline: 'Off the shipping lane ⚓', body: 'Even the best navigators re-plot.' },
    { key: 'FAIL_03', headline: 'A little off the waterline 🌫️', body: 'Fog can hide the right heading.' },
    { key: 'FAIL_04', headline: 'The horizon moved on you ⛴️', body: 'No captain is born at sea.' },
    { key: 'FAIL_05', headline: 'Ran aground on that one 🪨', body: 'Chart it, clear it, next time.' },
    { key: 'FAIL_06', headline: 'Wrong tack 🧭', body: "Come about — you'll catch the wind yet." },
    { key: 'FAIL_07', headline: 'Tide turned against you 🌀', body: 'Happens to every hand on deck.' },
    { key: 'FAIL_08', headline: 'A sandbar beneath the keel 🏖️', body: 'Small drag this time.' },
    { key: 'FAIL_09', headline: 'Anchor dragging ⚓', body: 'Hold fast — try again when set is right.' },
    { key: 'FAIL_10', headline: 'Compass swinging 🧲', body: 'Realign your bearings.' },
    { key: 'FAIL_11', headline: 'Squall caught you amidships ⛈️', body: 'Weather changes fast.' },
    { key: 'FAIL_12', headline: 'Wave broke over the bow 🌊', body: 'A shake, not a sink.' },
    { key: 'FAIL_13', headline: 'Rudder took a moment 🎛️', body: 'A touch of rudder lag.' },
    { key: 'FAIL_14', headline: 'Fog bank, briefly 🌁', body: 'It clears. Plot again.' },
    { key: 'FAIL_15', headline: 'Snagged a bit of kelp 🌿', body: 'Clean the propeller and press on.' },
  ];
  const expires = [
    { key: 'EXPIRE_DEFAULT', headline: 'Time\'s up, captain ⏳', body: 'The tide waited for no one — let the next mariner draw.' },
    { key: 'EXPIRE_01', headline: 'Bell tolled before you ⛵', body: 'A breeze in the rigging, but no course plotted.' },
    { key: 'EXPIRE_02', headline: 'The hourglass ran dry 🕰️', body: 'Even the best skippers lose the light sometimes.' },
    { key: 'EXPIRE_03', headline: 'Current carried you away 🌊', body: 'Tides turn quickly in these straits.' },
    { key: 'EXPIRE_04', headline: 'Lost in the fog 🌁', body: 'No harm done — the harbour still stands.' },
    { key: 'EXPIRE_05', headline: 'Watch change without a reading 🧭', body: 'Pass the wheel — fresh eyes are ready.' },
  ];
  for (const t of hoorays) {
    await prisma.resultTemplate.upsert({
      where: { key: t.key },
      update: { headline: t.headline, bodyMarkdown: t.body, isActive: true },
      create: { key: t.key, headline: t.headline, bodyMarkdown: t.body, isActive: true },
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
  for (const t of expires) {
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
    { key: 'result.auto_reset_fallback_seconds', value: 120, type: 'int' },
    { key: 'result.auto_reset_fallback_enabled', value: true, type: 'bool' },
    { key: 'branding.product_name', value: 'OceanDraft', type: 'string' },
    { key: 'branding.animations_enabled', value: true, type: 'bool' },
    { key: 'branding.sound_enabled', value: true, type: 'bool' },
    { key: 'branding.ambient_ocean_enabled', value: true, type: 'bool' },
    { key: 'privacy.policy_url', value: '/privacy', type: 'url' },
  ];
  const forceReset = new Set([
    'attempt.policy',
    'assignment.mode',
    'event.kiosk_mode',
    'event.collect_mobile',
    'event.auto_reset_seconds',
    'event.booth_name',
    'privacy.policy_url',
    'branding.animations_enabled',
    'branding.sound_enabled',
    'branding.ambient_ocean_enabled',
    'result.auto_reset_fallback_seconds',
    'result.auto_reset_fallback_enabled',
  ]);
  for (const s of settings) {
    const force = forceReset.has(s.key);
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: force ? { valueJson: s.value as never, type: s.type } : {},
      create: { key: s.key, valueJson: s.value as never, type: s.type },
    });
  }

  const qCount = await prisma.question.count();
  console.log(`✅ Seed complete. ${qCount} questions, ${hoorays.length} HOORAY + ${fails.length} FAIL templates.`);
  console.log(`   Admin username: ${username}`);
  console.log(`   Admin password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
