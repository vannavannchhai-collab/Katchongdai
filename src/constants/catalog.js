export const EVENT_TYPES = {
  wedding: {
    id: 'wedding',
    km: 'ពិធីមង្គលការ',
    en: 'Wedding Ceremony',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    accentGrad: 'from-amber-600 via-yellow-500 to-amber-700',
    cardBg: 'from-amber-50 to-orange-50/60',
    emoji: '💍',
    hasGroomBrideSides: true,
    defaultGreeting:
      'សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមានដ៏ខ្ពង់ខ្ពស់ និងចំណងដៃដ៏ថ្លៃថ្លារបស់ឯកឧត្តម លោកជំទាវ ឧកញ៉ា លោក លោកស្រី អ្នកនាងកញ្ញា ក្នុងពិធីមង្គលការរបស់យើងខ្ញុំ។',
  },
  engagement: {
    id: 'engagement',
    km: 'ពិធីភ្ជាប់ពាក្យ',
    en: 'Engagement Ceremony',
    badgeClass: 'bg-pink-100 text-pink-900 border-pink-300',
    accentGrad: 'from-pink-600 to-rose-600',
    cardBg: 'from-pink-50 to-rose-50/60',
    emoji: '🌸',
    hasGroomBrideSides: true,
    defaultGreeting:
      'សូមអរគុណចំពោះវត្តមានដ៏កក់ក្តៅ និងការជូនពរក្នុងពិធីភ្ជាប់ពាក្យរបស់កូនប្រុសកូនស្រីយើងខ្ញុំ។',
  },
  housewarming: {
    id: 'housewarming',
    km: 'ពិធីឡើងគេហដ្ឋានថ្មី',
    en: 'Housewarming Ceremony',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentGrad: 'from-emerald-600 to-teal-600',
    cardBg: 'from-emerald-50 to-teal-50/60',
    emoji: '🏡',
    hasGroomBrideSides: false,
    defaultGreeting:
      'សូមគោរពថ្លែងអំណរគុណចំពោះញាតិមិត្តជិតឆ្ងាយ ដែលបានអញ្ជើញចូលរួមអបអរសាទរពិធីឡើងគេហដ្ឋានថ្មីរបស់គ្រួសារយើងខ្ញុំ។',
  },
  kathen_merit: {
    id: 'kathen_merit',
    km: 'បុណ្យកឋិនទាន / បុណ្យទាន',
    en: 'Kathen & Buddhist Merit',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-300',
    accentGrad: 'from-violet-600 to-indigo-700',
    cardBg: 'from-violet-50 to-indigo-50/60',
    emoji: '🪷',
    hasGroomBrideSides: false,
    defaultGreeting:
      'សូមអនុមោទនាបុណ្យកុសល! សូមផលានិសង្សនៃបុណ្យកុសលនេះ ជួយបីបាច់ថែរក្សាលោកអ្នកឱ្យជួបតែពុទ្ធពរទាំង ៤ប្រការ។',
  },
  funeral: {
    id: 'funeral',
    km: 'បុណ្យសព / បុណ្យ ៧-១០០ថ្ងៃ',
    en: 'Funeral & Memorial',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    accentGrad: 'from-slate-700 to-slate-900',
    cardBg: 'from-slate-100 to-gray-50',
    emoji: '🕯️',
    hasGroomBrideSides: false,
    defaultGreeting:
      'ក្រុមគ្រួសារសូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅ ចំពោះការចូលរួមរំលែកទុក្ខ និងចូលបច្ច័យបុណ្យទក្ខិណានុប្បទាន។',
  },
  birthday: {
    id: 'birthday',
    km: 'បង្កក់កូន / ខួបកំណើត',
    en: 'Baby Blessing & Birthday',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    accentGrad: 'from-rose-500 to-orange-500',
    cardBg: 'from-rose-50 to-orange-50/60',
    emoji: '🎂',
    hasGroomBrideSides: false,
    defaultGreeting:
      'សូមអរគុណអ៊ំពូមីងបងប្អូនមិត្តភក្តិ ដែលបានចូលរួមអបអរសាទរ និងប្រសិទ្ធពរជ័យក្នុងថ្ងៃដ៏រីករាយនេះ!',
  },
  opening: {
    id: 'opening',
    km: 'សម្ពោធហាង / អាជីវកម្ម',
    en: 'Grand Opening',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    accentGrad: 'from-sky-600 to-blue-700',
    cardBg: 'from-sky-50 to-blue-50/60',
    emoji: '🎊',
    hasGroomBrideSides: false,
    defaultGreeting:
      'សូមថ្លែងអំណរគុណចំពោះវត្តមានដ៏ថ្លៃថ្លាក្នុងពិធីសម្ពោធជាផ្លូវការនៃអាជីវកម្មរបស់យើងខ្ញុំ!',
  },
  other: {
    id: 'other',
    km: 'កម្មវិធីផ្សេងៗ',
    en: 'Custom Ceremony',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    accentGrad: 'from-cyan-600 to-teal-700',
    cardBg: 'from-cyan-50 to-teal-50/60',
    emoji: '✨',
    hasGroomBrideSides: false,
    defaultGreeting:
      'សូមគោរពថ្លែងអំណរគុណចំពោះវត្តមាន និងចំណងដៃដ៏ថ្លៃថ្លារបស់លោកអ្នក!',
  },
};

export const GUEST_TITLES = [
  'លោក',
  'លោកស្រី',
  'អ្នកនាង',
  'កញ្ញា',
  'គ្រួសារលោក',
  'ឧកញ៉ា',
  'ឯកឧត្តម',
  'លោកជំទាវ',
  'អ្នកស្រី',
  'លោកគ្រូ',
  'អ្នកគ្រូ',
  'ឧបាសក',
  'ឧបាសិកា',
  'ព្រះតេជគុណ',
  'លោកតា',
  'លោកយាយ',
];

export const PAYMENT_METHODS = {
  cash: { id: 'cash', km: 'សាច់ប្រាក់ (ស្រោមសំបុត្រ)', en: 'Cash Envelope', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', short: 'សាច់ប្រាក់' },
  aba_khqr: { id: 'aba_khqr', km: 'ABA KHQR / ABA Pay', en: 'ABA KHQR', badge: 'bg-sky-100 text-sky-900 border-sky-200', short: 'ABA KHQR' },
  acleda: { id: 'acleda', km: 'ACLEDA ទាន់ចិត្ត', en: 'ACLEDA Bank', badge: 'bg-blue-100 text-blue-900 border-blue-200', short: 'ACLEDA' },
  wing: { id: 'wing', km: 'Wing Bank', en: 'Wing Bank', badge: 'bg-lime-100 text-lime-900 border-lime-300', short: 'Wing' },
  bakong: { id: 'bakong', km: 'Bakong KHQR / ផ្សេងៗ', en: 'Bakong KHQR', badge: 'bg-red-100 text-red-900 border-red-200', short: 'Bakong' },
  gift_item: { id: 'gift_item', km: 'វត្ថុអនុស្សាវរីយ៍ / មាស', en: 'Gift / Gold', badge: 'bg-amber-100 text-amber-900 border-amber-300', short: 'វត្ថុ/មាស' },
};

export const GUEST_GROUPS = {
  relatives: { id: 'relatives', km: 'សាច់ញាតិបងប្អូន', en: 'Relatives' },
  friends: { id: 'friends', km: 'មិត្តភក្តិ', en: 'Friends' },
  colleagues: { id: 'colleagues', km: 'មិត្តរួមការងារ / ស្ថាប័ន', en: 'Colleagues' },
  neighbors: { id: 'neighbors', km: 'អ្នកជិតខាង / ភូមិផង', en: 'Neighbors' },
  vip: { id: 'vip', km: 'ភ្ញៀវកិត្តិយស VIP', en: 'VIP Guests' },
  monks_elders: { id: 'monks_elders', km: 'ព្រះសង្ឃ / ចាស់ព្រឹទ្ធាចារ្យ', en: 'Monks & Elders' },
  other: { id: 'other', km: 'ភ្ញៀវទូទៅ / ផ្សេងៗ', en: 'General' },
};

export const SIDES = {
  both: { id: 'both', km: 'រួមគ្នា / ម្ចាស់កម្មវិធី', en: 'Mutual / Host', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  groom: { id: 'groom', km: 'ខាងកូនប្រុស', en: 'Groom Side', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  bride: { id: 'bride', km: 'ខាងកូនស្រី', en: 'Bride Side', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export const EXPENSE_CATEGORIES = {
  catering: { id: 'catering', km: 'ម្ហូបអាហារ & ចុងភៅ', en: 'Catering & Tables', color: '#f59e0b' },
  venue_decor: { id: 'venue_decor', km: 'ទីតាំង រោងការ & ផ្កាស្រស់', en: 'Venue & Decor', color: '#10b981' },
  bridal_attire: { id: 'bridal_attire', km: 'សម្អាងការ & សម្លៀកបំពាក់', en: 'Attire & Makeup', color: '#ec4899' },
  photo_video: { id: 'photo_video', km: 'ថតរូប & វីដេអូ', en: 'Photo & Video', color: '#6366f1' },
  drinks: { id: 'drinks', km: 'ស្រាបៀរ ភេសជ្ជៈ & ទឹកសុទ្ធ', en: 'Drinks & Beverages', color: '#0ea5e9' },
  music_sound: { id: 'music_sound', km: 'ភ្លេងប្រពៃណី តន្ត្រី & ភ្លើង', en: 'Music & Sound', color: '#8b5cf6' },
  religious_monks: { id: 'religious_monks', km: 'បច្ច័យព្រះសង្ឃ & លោកអាចារ្យ', en: 'Monks & Ceremony', color: '#d97706' },
  invitations_gifts: { id: 'invitations_gifts', km: 'ធៀបអញ្ជើញ & វត្ថុអនុស្សាវរីយ៍', en: 'Invitations & Souvenirs', color: '#14b8a6' },
  other: { id: 'other', km: 'ចំណាយផ្សេងៗ', en: 'Other Expenses', color: '#64748b' },
};

export const RSVP_STATUSES = {
  invited: { id: 'invited', km: 'បានអញ្ជើញ', en: 'Invited', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  confirmed: { id: 'confirmed', km: 'បញ្ជាក់ចូលរួម', en: 'Confirmed', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  attended: { id: 'attended', km: 'បានចូលរួមរួច', en: 'Attended', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  declined: { id: 'declined', km: 'អវត្តមាន / ជាប់រវល់', en: 'Cannot Attend', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export const PROVINCES = [
  'សៀមរាប',
  'ភ្នំពេញ',
  'បាត់ដំបង',
  'កំពង់ចាម',
  'កណ្តាល',
  'ព្រះសីហនុ',
  'កំពត',
  'តាកែវ',
  'កំពង់ធំ',
  'បន្ទាយមានជ័យ',
  'ព្រៃវែង',
  'ស្វាយរៀង',
  'កំពង់ស្ពឺ',
  'កំពង់ឆ្នាំង',
  'ពោធិ៍សាត់',
  'ក្រចេះ',
  'ត្បូងឃ្មុំ',
  'កោះកុង',
  'កែប',
  'ប៉ៃលិន',
  'ឧត្តរមានជ័យ',
  'ព្រះវិហារ',
  'ស្ទឹងត្រែង',
  'រតនគិរី',
  'មណ្ឌលគិរី',
];

export const QUICK_USD_AMOUNTS = [10, 15, 20, 25, 30, 50, 100, 200, 500];
export const QUICK_KHR_AMOUNTS = [20000, 40000, 50000, 80000, 100000, 120000, 200000, 400000];

export const USD_DENOMINATIONS = [
  { key: 'usd_100', value: 100, label: '$100' },
  { key: 'usd_50', value: 50, label: '$50' },
  { key: 'usd_20', value: 20, label: '$20' },
  { key: 'usd_10', value: 10, label: '$10' },
  { key: 'usd_5', value: 5, label: '$5' },
  { key: 'usd_2', value: 2, label: '$2' },
  { key: 'usd_1', value: 1, label: '$1' },
];

export const KHR_DENOMINATIONS = [
  { key: 'khr_100000', value: 100000, label: '100,000 ៛' },
  { key: 'khr_50000', value: 50000, label: '50,000 ៛' },
  { key: 'khr_20000', value: 20000, label: '20,000 ៛' },
  { key: 'khr_10000', value: 10000, label: '10,000 ៛' },
  { key: 'khr_5000', value: 5000, label: '5,000 ៛' },
  { key: 'khr_2000', value: 2000, label: '2,000 ៛' },
  { key: 'khr_1000', value: 1000, label: '1,000 ៛' },
  { key: 'khr_500', value: 500, label: '500 ៛' },
  { key: 'khr_100', value: 100, label: '100 ៛' },
];

export const CLERK_DESKS = [
  'តុទទួលភ្ញៀវទី១ (សុខា)',
  'តុទទួលភ្ញៀវទី២ (ដារ៉ា)',
  'តុទទួលភ្ញៀវ VIP',
  'ម្ចាស់កម្មវិធីផ្ទាល់',
  'គណៈកម្មការបុណ្យ',
];

export function formatUSD(val) {
  const num = Number(val) || 0;
  return (
    '$' +
    num.toLocaleString('en-US', {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatKHR(val) {
  const num = Math.round(Number(val) || 0);
  return num.toLocaleString('en-US') + ' ៛';
}

export function toKhmerNumerals(input) {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(input).replace(/\d/g, (d) => khmerDigits[Number(d)]);
}

export function formatKhmerDate(dateStr) {
  if (!dateStr) return '—';
  const monthsKm = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
  ];
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${monthsKm[monthIdx] || m} ${y}`;
}

export function downloadCSV(filename, headers, rows) {
  const escapeCell = (v) => {
    const str = String(v ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  // UTF-8 BOM (\uFEFF) ensures Khmer script displays properly in Microsoft Excel!
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseSimpleCSV(text) {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const splitCSVLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    return {
      receipt_no: obj['receipt_no'] || obj['លេខរៀង'] || '',
      guest_title: obj['guest_title'] || obj['ងារ'] || 'លោក',
      guest_name: obj['guest_name'] || obj['ឈ្មោះភ្ញៀវ'] || obj['name'] || cols[1] || cols[0] || '',
      guest_phone: obj['guest_phone'] || obj['លេខទូរស័ព្ទ'] || obj['phone'] || '',
      guest_location: obj['guest_location'] || obj['ទីតាំង'] || obj['មកពី'] || '',
      guest_group: obj['guest_group'] || 'friends',
      side: obj['side'] || 'both',
      amount_usd: parseFloat(String(obj['amount_usd'] || obj['ប្រាក់ដុល្លារ'] || obj['usd'] || '0').replace(/[^0-9.]/g, '')) || 0,
      amount_khr: parseFloat(String(obj['amount_khr'] || obj['ប្រាក់រៀល'] || obj['khr'] || '0').replace(/[^0-9.]/g, '')) || 0,
      payment_method: obj['payment_method'] || 'cash',
      table_number: obj['table_number'] || obj['លេខតុ'] || '',
      blessing_note: obj['blessing_note'] || obj['ចំណាំ'] || '',
    };
  });
}
