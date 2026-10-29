import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'katchongdai.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'wedding',
      host_names TEXT NOT NULL DEFAULT '',
      parent_names TEXT NOT NULL DEFAULT '',
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL DEFAULT '17:00',
      location_name TEXT NOT NULL DEFAULT '',
      province TEXT NOT NULL DEFAULT 'សៀមរាប',
      address TEXT NOT NULL DEFAULT '',
      map_link TEXT NOT NULL DEFAULT '',
      exchange_rate REAL NOT NULL DEFAULT 4000,
      target_budget_usd REAL NOT NULL DEFAULT 0,
      expected_guests INTEGER NOT NULL DEFAULT 200,
      total_tables INTEGER NOT NULL DEFAULT 25,
      seats_per_table INTEGER NOT NULL DEFAULT 10,
      price_per_table_usd REAL NOT NULL DEFAULT 160,
      khqr_aba_name TEXT NOT NULL DEFAULT '',
      khqr_aba_account TEXT NOT NULL DEFAULT '',
      khqr_acleda_account TEXT NOT NULL DEFAULT '',
      khqr_wing_account TEXT NOT NULL DEFAULT '',
      greeting_message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      theme_color TEXT NOT NULL DEFAULT 'amber',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      receipt_no TEXT NOT NULL,
      envelope_no TEXT NOT NULL DEFAULT '',
      guest_title TEXT NOT NULL DEFAULT 'លោក',
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL DEFAULT '',
      guest_location TEXT NOT NULL DEFAULT '',
      guest_group TEXT NOT NULL DEFAULT 'friends',
      side TEXT NOT NULL DEFAULT 'both',
      amount_usd REAL NOT NULL DEFAULT 0,
      amount_khr REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_ref TEXT NOT NULL DEFAULT '',
      gift_description TEXT NOT NULL DEFAULT '',
      gift_estimated_usd REAL NOT NULL DEFAULT 0,
      table_number TEXT NOT NULL DEFAULT '',
      pax_count INTEGER NOT NULL DEFAULT 1,
      blessing_note TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL DEFAULT 'តុទទួលភ្ញៀវទី១',
      verification_status TEXT NOT NULL DEFAULT 'verified',
      invitation_id INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contributions_event ON contributions(event_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_guest ON contributions(guest_name);

    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      guest_title TEXT NOT NULL DEFAULT 'លោក',
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL DEFAULT '',
      guest_location TEXT NOT NULL DEFAULT '',
      guest_group TEXT NOT NULL DEFAULT 'friends',
      side TEXT NOT NULL DEFAULT 'both',
      table_number TEXT NOT NULL DEFAULT '',
      seats_reserved INTEGER NOT NULL DEFAULT 2,
      card_delivered INTEGER NOT NULL DEFAULT 1,
      rsvp_status TEXT NOT NULL DEFAULT 'invited',
      expected_chongdai_note TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_invitations_event ON invitations(event_id);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'catering',
      item_name TEXT NOT NULL,
      vendor_name TEXT NOT NULL DEFAULT '',
      vendor_phone TEXT NOT NULL DEFAULT '',
      total_amount_usd REAL NOT NULL DEFAULT 0,
      total_amount_khr REAL NOT NULL DEFAULT 0,
      paid_amount_usd REAL NOT NULL DEFAULT 0,
      paid_amount_khr REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      expense_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);

    CREATE TABLE IF NOT EXISTS outgoing_gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_title TEXT NOT NULL DEFAULT 'លោក',
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL DEFAULT '',
      recipient_location TEXT NOT NULL DEFAULT '',
      relationship TEXT NOT NULL DEFAULT 'friends',
      event_type TEXT NOT NULL DEFAULT 'wedding',
      event_title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      amount_usd REAL NOT NULL DEFAULT 0,
      amount_khr REAL NOT NULL DEFAULT 0,
      exchange_rate REAL NOT NULL DEFAULT 4000,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      gift_description TEXT NOT NULL DEFAULT '',
      returned_status TEXT NOT NULL DEFAULT 'pending_return',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_outgoing_recipient ON outgoing_gifts(recipient_name);

    CREATE TABLE IF NOT EXISTS cash_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL UNIQUE,
      denominations_json TEXT NOT NULL DEFAULT '{}',
      counted_by TEXT NOT NULL DEFAULT 'គណៈកម្មការរាប់ប្រាក់',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER DEFAULT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'ប្រព័ន្ធ',
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function logAudit(eventId, action, actor, summary) {
  db.prepare(
    `INSERT INTO audit_logs (event_id, action, actor, summary, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(eventId || null, action, actor || 'អ្នកកត់ត្រា', summary);
}

export function clearAllData() {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM cash_counts;
    DELETE FROM expenses;
    DELETE FROM invitations;
    DELETE FROM contributions;
    DELETE FROM outgoing_gifts;
    DELETE FROM events;
    DELETE FROM sqlite_sequence;
  `);
}

export function seedDemoData() {
  clearAllData();

  const insertEvent = db.prepare(`
    INSERT INTO events (
      code, title, event_type, host_names, parent_names, event_date, event_time,
      location_name, province, address, map_link, exchange_rate, target_budget_usd,
      expected_guests, total_tables, seats_per_table, price_per_table_usd,
      khqr_aba_name, khqr_aba_account, khqr_acleda_account, khqr_wing_account,
      greeting_message, status, theme_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Event 1: Wedding Ceremony (ពិធីមង្គលការ)
  const ev1 = insertEvent.run(
    'EVT-2026-001',
    'ពិធីមង្គលការ វណ្ណា វិបុល & សុខ សុជាតា',
    'wedding',
    'កូនប្រុស វណ្ណា វិបុល និង កូនស្រី សុខ សុជាតា',
    'លោក វណ្ណា សំអាត & អ្នកស្រី ហេង សុភាព (ខាងកូនប្រុស) | លោក សុខ ចាន់ថន & អ្នកស្រី ម៉ៅ សុផានី (ខាងកូនស្រី)',
    '2026-11-14',
    '17:30',
    'មជ្ឈមណ្ឌលសន្និបាត និងពិព័រណ៍ អង្គរផាឡេស (អាគារ A)',
    'សៀមរាប',
    'ផ្លូវជាតិលេខ៦ សង្កាត់ស្វាយដង្គំ ក្រុងសៀមរាប ខេត្តសៀមរាប',
    'https://maps.google.com/?q=Siem+Reap+Cambodia',
    4000,
    9500,
    450,
    45,
    10,
    165,
    'VANNA VIBOL & SOK SOCHEATA',
    '002 889 168',
    '092 778 899',
    '012 889 168',
    'សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមានដ៏ខ្ពង់ខ្ពស់ និងចំណងដៃដ៏ថ្លៃថ្លារបស់ឯកឧត្តម លោកជំទាវ ឧកញ៉ា លោក លោកស្រី អ្នកនាងកញ្ញា។ សូមជូនពរជួបប្រទះតែពុទ្ធពរទាំង ៤ប្រការ គឺ អាយុ វណ្ណៈ សុខៈ ពលៈ កុំបីឃ្លៀងឃ្លាតឡើយ។',
    'active',
    'amber'
  );
  const weddingId = Number(ev1.lastInsertRowid);

  // Event 2: Housewarming (ពិធីឡើងគេហដ្ឋានថ្មី)
  const ev2 = insertEvent.run(
    'EVT-2026-002',
    'ពិធីឡើងគេហដ្ឋានថ្មី គ្រួសារលោក ចាន់ រដ្ឋា & អ្នកស្រី លី ម៉ាលី',
    'housewarming',
    'លោក ចាន់ រដ្ឋា និង អ្នកស្រី លី ម៉ាលី',
    'គ្រួសារត្រកូល ចាន់ និង ត្រកូល លី',
    '2026-10-25',
    '17:00',
    'បុរី ប៉េងហួត ដឹស្តាព្រីមៀរ៍ ផ្ទះលេខ 88 ផ្លូវ P-09',
    'ភ្នំពេញ',
    'សង្កាត់ភ្នំពេញថ្មី ខណ្ឌសែនសុខ រាជធានីភ្នំពេញ',
    'https://maps.google.com/?q=Sen+Sok+Phnom+Penh',
    4050,
    3800,
    180,
    18,
    10,
    150,
    'CHAN RATHA',
    '001 556 789',
    '015 556 789',
    '089 556 789',
    'សូមអរគុណយ៉ាងជ្រាលជ្រៅចំពោះញាតិមិត្តជិតឆ្ងាយដែលបានផ្តល់កិត្តិយសចូលរួមអបអរសាទរពិធីឡើងគេហដ្ឋានថ្មីរបស់គ្រួសារយើងខ្ញុំ។',
    'active',
    'emerald'
  );
  const houseId = Number(ev2.lastInsertRowid);

  // Event 3: Buddhist Kathen Merit Ceremony (បុណ្យកឋិនទានសាមគ្គី)
  const ev3 = insertEvent.run(
    'EVT-2026-003',
    'ពិធីបុណ្យកឋិនទានសាមគ្គី ដង្ហែទៅវត្តបូព៌',
    'kathen_merit',
    'ឧបាសក វណ្ណា សំអាត និង ឧបាសិកា ហេង សុភាព ព្រមទាំងពុទ្ធបរិស័ទជិតឆ្ងាយ',
    'គណៈកម្មការអាចារ្យវត្តបូព៌ ក្រុងសៀមរាប',
    '2026-11-02',
    '07:30',
    'វត្តបូព៌ ក្រុងសៀមរាប',
    'សៀមរាប',
    'ភូមិវត្តបូព៌ សង្កាត់សាលាកំរើក ក្រុងសៀមរាប',
    '',
    4000,
    2200,
    250,
    20,
    10,
    80,
    'SAMART VANNA MERIT',
    '004 999 108',
    '012 334 556',
    '',
    'សូមអនុមោទនាបុណ្យកុសល! សូមផលានិសង្សនៃអង្គកឋិនទាននេះ ជួយបីបាច់ថែរក្សាលោកអ្នកឱ្យជួបតែសេចក្តីសុខសេចក្តីចម្រើនគ្រប់ប្រការ។',
    'upcoming',
    'violet'
  );
  const kathenId = Number(ev3.lastInsertRowid);

  // Event 4: Baby 1-Month & Birthday (ពិធីបង្កក់កូន & ខួបកំណើត)
  const ev4 = insertEvent.run(
    'EVT-2026-004',
    'ពិធីបង្កក់កូនប្រុសច្បង និងខួបគម្រប់ ១ឆ្នាំ ចាន់ សុវណ្ណរាជ',
    'birthday',
    'លោក ចាន់ ឧត្តម និង អ្នកនាង កែវ មុនីរ័ត្ន',
    'ជីដូនជីតាទាំងសងខាង',
    '2026-09-12',
    '18:00',
    'ភោជនីយដ្ឋាន ទន្លេមាស បាត់ដំបង',
    'បាត់ដំបង',
    'ផ្លូវមាត់ស្ទឹងសង្កែ ក្រុងបាត់ដំបង',
    '',
    4000,
    1500,
    100,
    10,
    10,
    120,
    'CHAN OUDOM',
    '005 123 999',
    '',
    '',
    'អរគុណអ៊ំពូមីងតាយាយ ដែលបានអញ្ជើញចូលរួមជូនពរចៅប្រុស សុវណ្ណរាជ!',
    'completed',
    'rose'
  );
  const bdayId = Number(ev4.lastInsertRowid);

  // Event 5: 100-Day Memorial (ពិធីបុណ្យទក្ខិណានុប្បទាន ១០០ថ្ងៃ)
  const ev5 = insertEvent.run(
    'EVT-2026-005',
    'ពិធីបុណ្យទក្ខិណានុប្បទានគម្រប់ ១០០ថ្ងៃ ឧបាសក ម៉ៅ សំអឿន',
    'funeral',
    'ក្រុមគ្រួសារនៃសព ឧបាសក ម៉ៅ សំអឿន',
    'កូនចៅប្រុសស្រីទាំង ៦នាក់',
    '2026-08-18',
    '08:00',
    'គេហដ្ឋាននៃសព ភូមិបឹងកុក ខេត្តកំពង់ចាម',
    'កំពង់ចាម',
    'សង្កាត់បឹងកុក ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម',
    '',
    4000,
    2600,
    220,
    22,
    10,
    95,
    'MAO FAMILY',
    '007 404 202',
    '097 404 202',
    '',
    'សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះការចូលរួមរំលែកទុក្ខ និងចូលបច្ច័យបុណ្យទក្ខិណានុប្បទានគម្រប់ ១០០ថ្ងៃ។',
    'completed',
    'slate'
  );
  const funeralId = Number(ev5.lastInsertRowid);

  // Seed Invitations for Wedding (Event 1)
  const insertInvite = db.prepare(`
    INSERT INTO invitations (
      event_id, invite_code, guest_title, guest_name, guest_phone, guest_location,
      guest_group, side, table_number, seats_reserved, card_delivered, rsvp_status,
      expected_chongdai_note, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const weddingInvites = [
    ['INV-W001', 'ឧកញ៉ា', 'លឹម សម្បត្តិ', '012 888 999', 'ភ្នំពេញ', 'vip', 'groom', 'VIP-1', 2, 1, 'attended', 'យើងធ្លាប់ចងដៃគាត់ $200 (2025)', 'ភ្ញៀវកិត្តិយសពិសេស'],
    ['INV-W002', 'ឯកឧត្តម', 'ប្រាក់ សុវណ្ណារ៉ា', '012 333 777', 'សៀមរាប', 'vip', 'both', 'VIP-1', 2, 1, 'attended', '', 'អញ្ជើញជាអធិបតី'],
    ['INV-W003', 'លោក', 'សុខ ពិសិដ្ឋ', '017 456 123', 'សៀមរាប', 'friends', 'groom', 'T-02', 2, 1, 'attended', 'យើងធ្លាប់ចងដៃមង្គលការគាត់ $50', 'មិត្តភក្តិសាកលវិទ្យាល័យ'],
    ['INV-W004', 'លោកស្រី', 'ហេង ចន្ធូ', '092 223 344', 'បាត់ដំបង', 'relatives', 'groom', 'T-01', 4, 1, 'attended', 'អ៊ំស្រីបង្កើត', 'មកទាំងគ្រួសារ ៤នាក់'],
    ['INV-W005', 'កញ្ញា', 'គង់ ស្រីនាង', '010 998 877', 'សៀមរាប', 'colleagues', 'bride', 'T-03', 1, 1, 'attended', 'យើងធ្លាប់ចងដៃឡើងផ្ទះគាត់ 200,000៛', 'មិត្តរួមការងារធនាគារ'],
    ['INV-W006', 'គ្រួសារលោក', 'ជា សុផល', '012 654 321', 'សៀមរាប', 'neighbors', 'bride', 'T-04', 2, 1, 'attended', '', 'អ្នកជិតខាងភូមិស្វាយដង្គំ'],
    ['INV-W007', 'លោក', 'មាស តារា', '096 777 111', 'ភ្នំពេញ', 'colleagues', 'groom', 'T-02', 2, 1, 'confirmed', 'ធ្លាប់ចងដៃគាត់ $40', 'មកពីភ្នំពេញល្ងាចថ្ងៃសៅរ៍'],
    ['INV-W008', 'អ្នកនាង', 'ស៊ុន ស្រីពេជ្រ', '077 882 211', 'សៀមរាប', 'friends', 'bride', 'T-03', 2, 1, 'confirmed', '', 'មិត្តរួមថ្នាក់វិទ្យាល័យ'],
    ['INV-W009', 'លោកគ្រូ', 'ញឹក សំបូរ', '012 405 607', 'សៀមរាប', 'vip', 'groom', 'VIP-1', 2, 1, 'invited', '', 'អតីតនាយកសាលា'],
    ['INV-W010', 'លោក', 'ឃឹម រតនា', '081 300 400', 'កំពង់ធំ', 'relatives', 'bride', 'T-01', 3, 1, 'confirmed', '', 'បងជីដូនមួយខាងកូនស្រី'],
    ['INV-W011', 'លោកស្រី', 'ទេព សុខុម', '011 229 900', 'ភ្នំពេញ', 'friends', 'both', 'T-05', 1, 1, 'declined', '', 'ជាប់បេសកកម្មក្រៅប្រទេស (ផ្ញើចំណងដៃតាម ABA)'],
    ['INV-W012', 'លោក', 'ប៉ែន វឌ្ឍនា', '098 112 233', 'សៀមរាប', 'colleagues', 'groom', 'T-02', 1, 0, 'invited', '', 'មិនទាន់ជូនធៀបផ្ទាល់ដៃ'],
  ];

  const inviteIds = [];
  for (const inv of weddingInvites) {
    const r = insertInvite.run(weddingId, ...inv);
    inviteIds.push(Number(r.lastInsertRowid));
  }

  // Seed Contributions for Wedding (Event 1) - Dual currency, cash, ABA, ACLEDA, Wing, Gold!
  const insertContribution = db.prepare(`
    INSERT INTO contributions (
      event_id, receipt_no, envelope_no, guest_title, guest_name, guest_phone,
      guest_location, guest_group, side, amount_usd, amount_khr, payment_method,
      payment_ref, gift_description, gift_estimated_usd, table_number, pax_count,
      blessing_note, recorded_by, verification_status, invitation_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const weddingContributions = [
    ['0001', 'E-001', 'ឧកញ៉ា', 'លឹម សម្បត្តិ', '012 888 999', 'ភ្នំពេញ', 'vip', 'groom', 500, 0, 'cash', '', '', 0, 'VIP-1', 2, 'សូមជូនពរគូស្វាមីភរិយាថ្មី សុភមង្គលជានិរន្តរ៍ និងរកទទួលទានមានបាន!', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', inviteIds[0], '2026-10-29 17:15:00'],
    ['0002', 'E-002', 'ឯកឧត្តម', 'ប្រាក់ សុវណ្ណារ៉ា', '012 333 777', 'សៀមរាប', 'vip', 'both', 300, 400000, 'cash', '', '', 0, 'VIP-1', 2, 'ជូនពរស្រឡាញ់គ្នាដល់ចាស់កោងខ្នង', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', inviteIds[1], '2026-10-29 17:22:00'],
    ['0003', 'E-003', 'លោកស្រី', 'ហេង ចន្ធូ', '092 223 344', 'បាត់ដំបង', 'relatives', 'groom', 200, 200000, 'gift_item', '', 'ខ្សែដៃមាស ២ជី និងសាច់ប្រាក់បន្ថែម', 650, 'T-01', 4, 'អ៊ំស្រីជូនពរក្មួយទាំងពីរត្រជាក់ត្រជុំដូចទឹកអប់បំពង់ខ្ចី', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', inviteIds[3], '2026-10-29 17:30:00'],
    ['0004', 'E-004', 'លោក', 'សុខ ពិសិដ្ឋ', '017 456 123', 'សៀមរាប', 'friends', 'groom', 60, 0, 'aba_khqr', 'ABA-9981726', '', 0, 'T-02', 2, 'អបអរសាទរសម្លាញ់! ឆាប់បានកូនប្រុសកូនស្រីគួរឱ្យស្រឡាញ់', 'តុទទួលភ្ញៀវទី២ (ដារ៉ា)', 'verified', inviteIds[2], '2026-10-29 17:42:00'],
    ['0005', 'E-005', 'កញ្ញា', 'គង់ ស្រីនាង', '010 998 877', 'សៀមរាប', 'colleagues', 'bride', 50, 40000, 'aba_khqr', 'ABA-9981904', '', 0, 'T-03', 1, 'សូមឱ្យមានសុភមង្គលពេញមួយជីវិតណាបងស្រី!', 'តុទទួលភ្ញៀវទី២ (ដារ៉ា)', 'verified', inviteIds[4], '2026-10-29 17:50:00'],
    ['0006', 'E-006', 'គ្រួសារលោក', 'ជា សុផល', '012 654 321', 'សៀមរាប', 'neighbors', 'bride', 0, 200000, 'cash', '', '', 0, 'T-04', 2, 'ជូនពរសុខភាពល្អ រកស៊ីមានបាន', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', inviteIds[5], '2026-10-29 18:05:00'],
    ['0007', 'E-007', 'លោក', 'លី ហួត', '012 909 101', 'សៀមរាប', 'colleagues', 'groom', 50, 0, 'cash', '', '', 0, 'T-02', 1, '', 'តុទទួលភ្ញៀវទី២ (ដារ៉ា)', 'verified', null, '2026-10-29 18:12:00'],
    ['0008', 'E-008', 'អ្នកស្រី', 'ម៉ម សាវឿន', '089 445 566', 'សៀមរាប', 'neighbors', 'groom', 20, 80000, 'cash', '', '', 0, 'T-04', 2, 'សូមឱ្យកូនចៅសុខសប្បាយ', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', null, '2026-10-29 18:18:00'],
    ['0009', 'E-009', 'លោកស្រី', 'ទេព សុខុម', '011 229 900', 'ភ្នំពេញ', 'friends', 'both', 100, 0, 'aba_khqr', 'ABA-9982450', '', 0, 'T-05', 0, 'សូមទោសមិនបានមកចូលរួមផ្ទាល់ សូមផ្ញើចំណងដៃជូនពរពីចម្ងាយ!', 'ផ្ញើតាមអនឡាញ (KHQR)', 'verified', inviteIds[10], '2026-10-29 18:25:00'],
    ['0010', 'E-010', 'លោក', 'ឆាយ វណ្ណៈ', '093 551 122', 'បន្ទាយមានជ័យ', 'friends', 'groom', 0, 160000, 'acleda', 'ACL-332198', '', 0, 'T-05', 2, 'ជូនពរសម្លាញ់ជោគជ័យគ្រប់ភារកិច្ច', 'តុទទួលភ្ញៀវទី២ (ដារ៉ា)', 'verified', null, '2026-10-29 18:34:00'],
    ['0011', 'E-011', 'អ្នកនាង', 'ពេជ្រ សោភា', '015 667 788', 'សៀមរាប', 'friends', 'bride', 40, 0, 'cash', '', '', 0, 'T-03', 1, 'រីករាយថ្ងៃមង្គលការមិត្តសម្លាញ់!', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', null, '2026-10-29 18:45:00'],
    ['0012', 'E-012', 'គ្រួសារលោក', 'អ៊ុក សំណាង', '012 717 273', 'ភ្នំពេញ', 'relatives', 'bride', 150, 0, 'cash', '', '', 0, 'T-01', 3, 'ពូនិងមីងជូនពរក្មួយទាំងពីរមានសុភមង្គល', 'តុទទួលភ្ញៀវទី១ (សុខា)', 'verified', null, '2026-10-29 18:55:00'],
    ['0013', 'E-013', 'លោក', 'ហ៊ុន រ៉ាវី', '070 889 911', 'សៀមរាប', 'colleagues', 'bride', 30, 40000, 'wing', 'WING-77412', '', 0, 'T-03', 1, '', 'តុទទួលភ្ញៀវទី២ (ដារ៉ា)', 'verified', null, '2026-10-29 19:05:00'],
    ['0014', 'E-014', 'លោក', 'កែវ ពិសី', '099 203 040', 'កណ្តាល', 'friends', 'groom', 50, 0, 'aba_khqr', 'ABA-ONLINE-551', '', 0, '', 0, 'ផ្ញើចំណងដៃតាមធៀបឌីជីថល សូមជូនពរសុភមង្គល!', 'ធៀបឌីជីថលអនឡាញ', 'pending_online', null, '2026-10-29 19:15:00'],
  ];

  for (const c of weddingContributions) {
    insertContribution.run(weddingId, ...c);
  }

  // Contributions for Event 2: Housewarming
  const houseContributions = [
    ['0001', 'H-01', 'លោក', 'សុខ ពិសិដ្ឋ', '017 456 123', 'សៀមរាប', 'friends', 'both', 50, 0, 'aba_khqr', 'ABA-11209', '', 0, 'T-01', 2, 'ឡើងផ្ទះថ្មី ត្រជាក់ត្រជុំ រកទទួលទានមានបាន!', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-10-25 17:30:00'],
    ['0002', 'H-02', 'ឧកញ៉ា', 'លឹម សម្បត្តិ', '012 888 999', 'ភ្នំពេញ', 'vip', 'both', 300, 0, 'gift_item', '', 'ទូរទស្សន៍ Smart TV 65 អ៊ីញ ១គ្រឿង និងស្រោមសំបុត្រ', 550, 'VIP-1', 2, 'ជូនពរគេហដ្ឋានថ្មីនាំលាភសំណាងធំ!', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-10-25 18:00:00'],
    ['0003', 'H-03', 'គ្រួសារលោក', 'នួន វិចិត្រ', '012 444 888', 'ភ្នំពេញ', 'neighbors', 'both', 100, 0, 'cash', '', '', 0, 'T-02', 3, 'សូមស្វាគមន៍មកកាន់បុរីយើង!', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-10-25 18:20:00'],
    ['0004', 'H-04', 'អ្នកស្រី', 'ស៊ឹម សុខា', '092 505 606', 'តាកែវ', 'relatives', 'both', 0, 400000, 'cash', '', '', 0, 'T-01', 2, 'ត្រជាក់ត្រជុំពេញផ្ទះថ្មី', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-10-25 18:45:00'],
  ];
  for (const c of houseContributions) {
    insertContribution.run(houseId, ...c);
  }

  // Contributions for Event 3: Kathen Merit
  const kathenContributions = [
    ['0001', 'K-01', 'ឧបាសក', 'គឹម ហេង', '012 301 401', 'សៀមរាប', 'monks_elders', 'both', 100, 200000, 'cash', '', 'ត្រៃចីវរ ១ឈុត', 60, '', 2, 'សូមអនុមោទនាបុណ្យកឋិនទាន!', 'គណៈកម្មការវត្ត', 'verified', null, '2026-10-28 08:30:00'],
    ['0002', 'K-02', 'ឧបាសិកា', 'យិន សាវ៉ាត', '092 108 108', 'សៀមរាប', 'monks_elders', 'both', 0, 500000, 'cash', '', '', 0, '', 1, 'សាធុ សាធុ សាធុ!', 'គណៈកម្មការវត្ត', 'verified', null, '2026-10-28 09:10:00'],
    ['0003', 'K-03', 'លោកស្រី', 'ហេង ចន្ធូ', '092 223 344', 'បាត់ដំបង', 'relatives', 'both', 50, 100000, 'aba_khqr', 'ABA-KATHEN-09', '', 0, '', 2, 'ចូលបច្ច័យកសាងសាលាឆាន់វត្តបូព៌', 'គណៈកម្មការវត្ត', 'verified', null, '2026-10-28 10:00:00'],
  ];
  for (const c of kathenContributions) {
    insertContribution.run(kathenId, ...c);
  }

  // Contributions for Event 4: Birthday / Baby Blessing
  const bdayContributions = [
    ['0001', 'B-01', 'លោកតា', 'កែវ សារឿន', '012 700 800', 'បាត់ដំបង', 'relatives', 'both', 200, 0, 'gift_item', '', 'កងជើងមាសកូនក្មេង ១គូ', 280, 'T-01', 2, 'ជូនពរចៅប្រុសឆ្លាតវៃ សុខភាពមាំមួន!', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-09-12 18:10:00'],
    ['0002', 'B-02', 'កញ្ញា', 'គង់ ស្រីនាង', '010 998 877', 'សៀមរាប', 'friends', 'both', 30, 0, 'aba_khqr', 'ABA-BD-22', '', 0, 'T-02', 1, 'Happy Birthday ក្មួយប្រុសសង្ហា!', 'ម្ចាស់កម្មវិធី', 'verified', null, '2026-09-12 18:40:00'],
  ];
  for (const c of bdayContributions) {
    insertContribution.run(bdayId, ...c);
  }

  // Contributions for Event 5: 100-Day Funeral Memorial
  const funeralContributions = [
    ['0001', 'F-01', 'គ្រួសារលោក', 'សំ សុផាត', '012 515 616', 'កំពង់ចាម', 'relatives', 'both', 100, 200000, 'cash', '', '', 0, '', 4, 'សូមឧទ្ទិសកុសលជូនវិញ្ញាណក្ខន្ធលោកអ៊ំទៅកាន់សុគតិភព', 'គណៈកម្មការបុណ្យ', 'verified', null, '2026-08-18 08:20:00'],
    ['0002', 'F-02', 'លោក', 'លី វណ្ណា', '017 202 303', 'ភ្នំពេញ', 'colleagues', 'both', 50, 0, 'aba_khqr', 'ABA-FUN-88', '', 0, '', 1, 'សូមចូលរួមរំលែកទុក្ខដ៏ក្រៀមក្រំបំផុត', 'គណៈកម្មការបុណ្យ', 'verified', null, '2026-08-18 09:05:00'],
  ];
  for (const c of funeralContributions) {
    insertContribution.run(funeralId, ...c);
  }

  // Seed Expenses for Wedding (Event 1) & Housewarming (Event 2)
  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      event_id, category, item_name, vendor_name, vendor_phone,
      total_amount_usd, total_amount_khr, paid_amount_usd, paid_amount_khr,
      payment_status, expense_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const weddingExpenses = [
    ['catering', 'ម្ហូបអាហារភ្ញៀវចំនួន ៤៥តុ (តម្លៃ $165/តុ)', 'ចុងភៅ មង្គលអង្គរ សៀមរាប', '012 911 222', 7425, 0, 3000, 0, 'partial', '2026-10-20', 'បានកក់មុន $3,000 នៅសល់ទូទាត់ក្រោយចប់កម្មវិធី'],
    ['venue_decor', 'ជួលអាគារ ម៉ាស៊ីនត្រជាក់ និងតុបតែងផ្កាស្រស់', 'Angkor Palace Event Hall', '063 760 511', 1800, 0, 1800, 0, 'paid', '2026-10-15', 'បង់ផ្តាច់រួចរាល់'],
    ['bridal_attire', 'សម្អាងការ សម្លៀកបំពាក់ប្រពៃណី ៧ឈុត និងផាត់មុខ', 'សម្អាងការ ទេពអប្សរា', '092 887 766', 1250, 0, 800, 0, 'partial', '2026-10-22', 'កក់មុន $800'],
    ['photo_video', 'ថតរូប Pre-wedding ថតថ្ងៃការ និងវីដេអូ Cinematic', 'ប្រណីត ស្ទូឌីយោ (Pranit Studio)', '010 443 322', 850, 0, 850, 0, 'paid', '2026-10-10', 'រួមបញ្ចូលរូបធំមុខរោង ២ផ្ទាំង'],
    ['drinks', 'ស្រាបៀរ ភេសជ្ជៈ និងទឹកសុទ្ធសម្រាប់ ៤៥តុ', 'ដេប៉ូភេសជ្ជៈ សៀមរាបរុងរឿង', '012 554 433', 980, 400000, 980, 400000, 'paid', '2026-10-28', 'អាចបង្វិលកេសសល់វិញបាន'],
    ['music_sound', 'វង់ភ្លេងប្រពៃណីខ្មែរ និងតន្ត្រីសម័យពេលល្ងាច', 'ក្រុមតន្ត្រី មរតកអង្គរ', '097 665 544', 650, 0, 300, 0, 'partial', '2026-10-25', 'កក់ $300'],
    ['religious_monks', 'បច្ច័យព្រះសង្ឃសូត្រមន្ត និងលោកអាចារ្យមង្គលការ', 'លោកអាចារ្យ ភិន សុខ', '012 312 412', 200, 800000, 200, 800000, 'paid', '2026-10-29', 'រៀបចំរួចរាល់'],
    ['invitations_gifts', 'បោះពុម្ពធៀបការ ៥០០សន្លឹក និងវត្ថុអនុស្សាវរីយ៍ជូនភ្ញៀវ', 'រោងពុម្ព ពន្លឺថ្មី', '015 900 100', 320, 0, 320, 0, 'paid', '2026-10-01', 'ធៀបពណ៌មាសក្រឡោត'],
  ];
  for (const ex of weddingExpenses) {
    insertExpense.run(weddingId, ...ex);
  }

  insertExpense.run(
    houseId, 'catering', 'ម្ហូបភ្ញៀវ ១៨តុ និងភេសជ្ជៈ', 'ចុងភៅ សុភមង្គលភ្នំពេញ', '012 800 900',
    2700, 0, 2700, 0, 'paid', '2026-10-25', 'ទូទាត់រួចរាល់'
  );

  // Seed Outgoing Chongdai (សៀវភៅចងដៃកម្មវិធីគេ - Reciprocity History)
  const insertOutgoing = db.prepare(`
    INSERT INTO outgoing_gifts (
      recipient_title, recipient_name, recipient_phone, recipient_location,
      relationship, event_type, event_title, event_date,
      amount_usd, amount_khr, exchange_rate, payment_method,
      gift_description, returned_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const outgoingList = [
    ['ឧកញ៉ា', 'លឹម សម្បត្តិ', '012 888 999', 'ភ្នំពេញ', 'vip', 'wedding', 'មង្គលការកូនប្រុសច្បង ឧកញ៉ា លឹម សម្បត្តិ', '2025-03-18', 200, 0, 4000, 'cash', '', 'returned', 'គាត់បានចងដៃតបមកវិញ $500 ក្នុងពិធីមង្គលការយើងឆ្នាំ 2026'],
    ['លោក', 'សុខ ពិសិដ្ឋ', '017 456 123', 'សៀមរាប', 'friends', 'wedding', 'មង្គលការ លោក សុខ ពិសិដ្ឋ', '2024-12-10', 50, 0, 4000, 'aba_khqr', '', 'returned', 'គាត់បានចងដៃតបមកវិញ $60'],
    ['កញ្ញា', 'គង់ ស្រីនាង', '010 998 877', 'សៀមរាប', 'colleagues', 'housewarming', 'ឡើងផ្ទះថ្មី កញ្ញា គង់ ស្រីនាង', '2025-06-22', 0, 200000, 4000, 'aba_khqr', '', 'returned', 'គាត់បានចងដៃតបវិញ $50 + 40,000៛'],
    ['លោក', 'មាស តារា', '096 777 111', 'ភ្នំពេញ', 'colleagues', 'wedding', 'មង្គលការប្អូនស្រី លោក មាស តារា', '2025-11-05', 40, 0, 4000, 'cash', '', 'pending_return', 'បានអញ្ជើញគាត់មកមង្គលការយើង តុ T-02'],
    ['លោកស្រី', 'ហេង ចន្ធូ', '092 223 344', 'បាត់ដំបង', 'relatives', 'kathen_merit', 'បុណ្យចម្រើនព្រះជន្មអ្នកម្តាយ អ៊ំស្រី ហេង ចន្ធូ', '2025-04-14', 100, 200000, 4000, 'cash', 'កន្ត្រកផ្លែឈើ និងទឹកត្រចៀកកាំ', 'returned', 'សាច់ញាតិជិតស្និទ្ធ'],
    ['លោក', 'វ៉ាន់ សុផាន់ណា', '012 606 707', 'សៀមរាប', 'friends', 'wedding', 'មង្គលការ លោក វ៉ាន់ សុផាន់ណា', '2026-02-14', 50, 0, 4000, 'aba_khqr', '', 'pending_return', 'មិត្តភក្តិរួមជំនាន់ គាត់មិនទាន់រៀបចំចងវិញ'],
    ['អ្នកនាង', 'ស៊ុន ស្រីពេជ្រ', '077 882 211', 'សៀមរាប', 'friends', 'opening', 'សម្ពោធហាងកាហ្វេ ស្រីពេជ្រ', '2026-05-01', 30, 40000, 4000, 'aba_khqr', 'កន្ត្រកផ្កាអបអរសាទរ', 'pending_return', 'បានអញ្ជើញមកមង្គលការយើង តុ T-03'],
  ];
  for (const og of outgoingList) {
    insertOutgoing.run(...og);
  }

  // Seed Cash Box Count for Wedding (Event 1) matching cash contributions!
  // Let's check exact cash contributions in Wedding (Event 1):
  // #0001: $500 cash
  // #0002: $300 + 400,000 KHR cash
  // #0003: $200 + 200,000 KHR (gift_item with cash) -> Note: cash reconciliation checks payment_method === 'cash' ($500 + $300 + $0 + $50 + $20 + $40 + $150 = $1,060 USD cash; and 400,000 + 200,000 + 80,000 = 680,000 KHR cash!)
  const denomSample = {
    usd_100: 8,   // $800
    usd_50: 4,    // $200
    usd_20: 3,    // $60 -> Total USD counted = $1,060! Exact match!
    usd_10: 0,
    usd_5: 0,
    usd_2: 0,
    usd_1: 0,
    khr_100000: 4, // 400,000
    khr_50000: 4,  // 200,000
    khr_20000: 4,  // 80,000 -> Total KHR counted = 680,000៛! Exact match!
    khr_10000: 0,
    khr_5000: 0,
    khr_2000: 0,
    khr_1000: 0,
    khr_500: 0,
    khr_100: 0,
  };

  db.prepare(`
    INSERT INTO cash_counts (event_id, denominations_json, counted_by, notes, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(
    weddingId,
    JSON.stringify(denomSample),
    'គណៈកម្មការរាប់ប្រាក់ (លោក វណ្ណា សំអាត & អ្នកកត់ត្រាសុខា)',
    'ផ្ទៀងផ្ទាត់សាច់ប្រាក់ក្នុងហិបលើកទី១ ត្រូវគ្នាគត់ជាមួយសៀវភៅកត់ត្រា!'
  );

  logAudit(weddingId, 'SEED_DEMO', 'ប្រព័ន្ធ Katchongdai', 'បានបង្កើតទិន្នន័យគំរូពេញលេញសម្រាប់គ្រប់ប្រភេទកម្មវិធី');
}

initSchema();
const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM events').get().cnt;
if (existingCount === 0) {
  seedDemoData();
}
