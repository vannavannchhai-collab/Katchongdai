import QRCode from 'qrcode';
import { createDemoSeedState } from './demoSeedData.js';

const LS_KEY = 'katchongdai_pro_db_v2';
const IDB_NAME = 'katchongdai_pro_idb';
const IDB_STORE = 'app_state';
const IDB_KEY = 'primary';

let memState = null;
let initPromise = null;

function nowTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function nextId(arr) {
  let max = 0;
  for (const item of arr) {
    const id = Number(item.id) || 0;
    if (id > max) max = id;
  }
  return max + 1;
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readFromIdb() {
  try {
    const db = await openIdb();
    if (!db) return null;
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeToIdb(state) {
  try {
    const db = await openIdb();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(state, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB write errors if private browsing restricts it
  }
}

async function ensureState() {
  if (memState) return memState;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let loaded = await readFromIdb();
    if (!loaded && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) loaded = JSON.parse(raw);
      } catch {
        loaded = null;
      }
    }

    if (!loaded || !Array.isArray(loaded.events)) {
      loaded = createDemoSeedState();
      await persistState(loaded);
    } else {
      loaded.contributions = loaded.contributions || [];
      loaded.invitations = loaded.invitations || [];
      loaded.expenses = loaded.expenses || [];
      loaded.outgoing_gifts = loaded.outgoing_gifts || [];
      loaded.cash_counts = loaded.cash_counts || [];
      loaded.audit_logs = loaded.audit_logs || [];
    }

    memState = loaded;
    return memState;
  })();

  return initPromise;
}

async function persistState(state) {
  memState = state;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded fallback: IndexedDB still stores full dataset
    }
  }
  await writeToIdb(state);
}

function logAudit(state, eventId, action, actor, summary) {
  state.audit_logs.push({
    id: nextId(state.audit_logs),
    event_id: eventId || null,
    action,
    actor: actor || 'អ្នកកត់ត្រា',
    summary,
    created_at: nowTimestamp(),
  });
}

function computeEventSummaries(state) {
  const sortedEvents = [...state.events].sort((a, b) => {
    const cmp = String(b.event_date || '').localeCompare(String(a.event_date || ''));
    return cmp !== 0 ? cmp : b.id - a.id;
  });

  return sortedEvents.map((ev) => {
    const rate = ev.exchange_rate > 0 ? ev.exchange_rate : 4000;
    const evContribs = state.contributions.filter((c) => Number(c.event_id) === Number(ev.id));
    const evExpenses = state.expenses.filter((ex) => Number(ex.event_id) === Number(ev.id));
    const evInvites = state.invitations.filter((inv) => Number(inv.event_id) === Number(ev.id));

    let total_pax = 0;
    let sum_usd = 0;
    let sum_khr = 0;
    let sum_gift_usd = 0;
    let pending_online_count = 0;
    let cash_usd = 0;
    let cash_khr = 0;
    let digital_usd = 0;
    let digital_khr = 0;

    for (const c of evContribs) {
      total_pax += Number(c.pax_count || 0);
      const u = Number(c.amount_usd || 0);
      const k = Number(c.amount_khr || 0);
      sum_usd += u;
      sum_khr += k;
      sum_gift_usd += Number(c.gift_estimated_usd || 0);
      if (c.verification_status === 'pending_online') pending_online_count += 1;
      if (c.payment_method === 'cash') {
        cash_usd += u;
        cash_khr += k;
      } else {
        digital_usd += u;
        digital_khr += k;
      }
    }

    let total_exp_usd = 0;
    let total_exp_khr = 0;
    let paid_exp_usd = 0;
    let paid_exp_khr = 0;
    for (const ex of evExpenses) {
      total_exp_usd += Number(ex.total_amount_usd || 0);
      total_exp_khr += Number(ex.total_amount_khr || 0);
      paid_exp_usd += Number(ex.paid_amount_usd || 0);
      paid_exp_khr += Number(ex.paid_amount_khr || 0);
    }

    let total_seats = 0;
    let attended_count = 0;
    let confirmed_count = 0;
    let delivered_count = 0;
    for (const inv of evInvites) {
      total_seats += Number(inv.seats_reserved || 0);
      if (inv.rsvp_status === 'attended') attended_count += 1;
      if (inv.rsvp_status === 'confirmed') confirmed_count += 1;
      if (Number(inv.card_delivered) === 1 || inv.card_delivered === true) delivered_count += 1;
    }

    const combined_usd = sum_usd + sum_khr / rate;
    const combined_khr = sum_khr + sum_usd * rate;
    const expenses_combined_usd = total_exp_usd + total_exp_khr / rate;
    const paid_expenses_combined_usd = paid_exp_usd + paid_exp_khr / rate;
    const net_surplus_usd = combined_usd - expenses_combined_usd;

    return {
      ...ev,
      stats: {
        total_entries: evContribs.length,
        total_pax,
        sum_usd,
        sum_khr,
        sum_gift_usd,
        combined_usd: Math.round(combined_usd * 100) / 100,
        combined_khr: Math.round(combined_khr),
        cash_usd,
        cash_khr,
        digital_usd,
        digital_khr,
        pending_online_count,
        expense_items: evExpenses.length,
        expenses_combined_usd: Math.round(expenses_combined_usd * 100) / 100,
        paid_expenses_combined_usd: Math.round(paid_expenses_combined_usd * 100) / 100,
        unpaid_expenses_usd: Math.round((expenses_combined_usd - paid_expenses_combined_usd) * 100) / 100,
        net_surplus_usd: Math.round(net_surplus_usd * 100) / 100,
        total_invites: evInvites.length,
        total_seats,
        attended_count,
        confirmed_count,
        delivered_count,
      },
    };
  });
}

function buildReciprocityDirectory(state) {
  const eventMap = new Map(state.events.map((e) => [Number(e.id), e]));
  const map = new Map();
  const norm = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const sortedIncoming = [...state.contributions].sort((a, b) => b.id - a.id);
  for (const row of sortedIncoming) {
    const ev = eventMap.get(Number(row.event_id));
    if (!ev) continue;
    const key = norm(row.guest_name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        key,
        display_title: row.guest_title || 'លោក',
        display_name: row.guest_name.trim(),
        phone: row.guest_phone || '',
        location: row.guest_location || '',
        group: row.guest_group || 'friends',
        incoming_records: [],
        outgoing_records: [],
        invitations: [],
        incoming_total_usd_equiv: 0,
        outgoing_total_usd_equiv: 0,
      });
    }
    const entry = map.get(key);
    if (!entry.phone && row.guest_phone) entry.phone = row.guest_phone;
    if (!entry.location && row.guest_location) entry.location = row.guest_location;
    const rate = ev.exchange_rate > 0 ? ev.exchange_rate : 4000;
    const eq = Number(row.amount_usd || 0) + Number(row.amount_khr || 0) / rate;
    entry.incoming_total_usd_equiv += eq;
    entry.incoming_records.push({
      id: row.id,
      event_id: row.event_id,
      event_title: ev.title,
      event_type: ev.event_type,
      event_date: ev.event_date,
      receipt_no: row.receipt_no,
      amount_usd: Number(row.amount_usd || 0),
      amount_khr: Number(row.amount_khr || 0),
      usd_equiv: Math.round(eq * 100) / 100,
      gift_description: row.gift_description,
      payment_method: row.payment_method,
    });
  }

  const sortedOutgoing = [...state.outgoing_gifts].sort((a, b) =>
    String(b.event_date || '').localeCompare(String(a.event_date || '')) || b.id - a.id
  );
  for (const row of sortedOutgoing) {
    const key = norm(row.recipient_name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        key,
        display_title: row.recipient_title || 'លោក',
        display_name: row.recipient_name.trim(),
        phone: row.recipient_phone || '',
        location: row.recipient_location || '',
        group: row.relationship || 'friends',
        incoming_records: [],
        outgoing_records: [],
        invitations: [],
        incoming_total_usd_equiv: 0,
        outgoing_total_usd_equiv: 0,
      });
    }
    const entry = map.get(key);
    if (!entry.phone && row.recipient_phone) entry.phone = row.recipient_phone;
    if (!entry.location && row.recipient_location) entry.location = row.recipient_location;
    const rate = row.exchange_rate > 0 ? row.exchange_rate : 4000;
    const eq = Number(row.amount_usd || 0) + Number(row.amount_khr || 0) / rate;
    entry.outgoing_total_usd_equiv += eq;
    entry.outgoing_records.push({
      id: row.id,
      event_title: row.event_title,
      event_type: row.event_type,
      event_date: row.event_date,
      amount_usd: Number(row.amount_usd || 0),
      amount_khr: Number(row.amount_khr || 0),
      usd_equiv: Math.round(eq * 100) / 100,
      gift_description: row.gift_description,
      returned_status: row.returned_status,
      notes: row.notes,
    });
  }

  for (const inv of state.invitations) {
    const ev = eventMap.get(Number(inv.event_id));
    if (!ev) continue;
    const key = norm(inv.guest_name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        key,
        display_title: inv.guest_title || 'លោក',
        display_name: inv.guest_name.trim(),
        phone: inv.guest_phone || '',
        location: inv.guest_location || '',
        group: inv.guest_group || 'friends',
        incoming_records: [],
        outgoing_records: [],
        invitations: [],
        incoming_total_usd_equiv: 0,
        outgoing_total_usd_equiv: 0,
      });
    }
    map.get(key).invitations.push({
      id: inv.id,
      event_id: inv.event_id,
      event_title: ev.title,
      table_number: inv.table_number,
      rsvp_status: inv.rsvp_status,
      side: inv.side,
      seats_reserved: inv.seats_reserved,
      expected_chongdai_note: inv.expected_chongdai_note,
    });
  }

  return Array.from(map.values())
    .map((p) => {
      const inc = Math.round(p.incoming_total_usd_equiv * 100) / 100;
      const out = Math.round(p.outgoing_total_usd_equiv * 100) / 100;
      const net = Math.round((inc - out) * 100) / 100;
      const suggested_return_usd =
        inc > out ? Math.ceil((inc - out + 10) / 5) * 5 : Math.max(20, out);
      return {
        ...p,
        incoming_total_usd_equiv: inc,
        outgoing_total_usd_equiv: out,
        net_balance_usd: net,
        suggested_return_usd,
      };
    })
    .sort(
      (a, b) =>
        b.incoming_total_usd_equiv +
        b.outgoing_total_usd_equiv -
        (a.incoming_total_usd_equiv + a.outgoing_total_usd_equiv)
    );
}

function getNextReceiptNo(state, eventId) {
  let maxNum = 0;
  for (const r of state.contributions) {
    if (Number(r.event_id) !== Number(eventId)) continue;
    const n = parseInt(String(r.receipt_no).replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return String(maxNum + 1).padStart(4, '0');
}

export async function handleLocalApiRequest(rawPath, options = {}) {
  const state = await ensureState();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  const urlObj = new URL(rawPath, 'http://localhost');
  const pathname = urlObj.pathname;

  // 1. GET /api/bootstrap
  if (method === 'GET' && pathname === '/api/bootstrap') {
    const events = computeEventSummaries(state);
    const outgoing = [...state.outgoing_gifts].sort(
      (a, b) => String(b.event_date || '').localeCompare(String(a.event_date || '')) || b.id - a.id
    );
    const auditLogs = [...state.audit_logs].sort((a, b) => b.id - a.id).slice(0, 40);
    const eventMap = new Map(state.events.map((e) => [Number(e.id), e]));

    const recentContributions = [...state.contributions]
      .sort((a, b) => b.id - a.id)
      .slice(0, 15)
      .map((c) => {
        const ev = eventMap.get(Number(c.event_id));
        return {
          ...c,
          event_title: ev?.title || '',
          event_type: ev?.event_type || 'wedding',
          exchange_rate: ev?.exchange_rate || 4000,
        };
      });

    const globalTotals = events.reduce(
      (acc, ev) => {
        acc.total_events += 1;
        acc.total_entries += ev.stats.total_entries;
        acc.sum_usd += ev.stats.sum_usd;
        acc.sum_khr += ev.stats.sum_khr;
        acc.combined_usd += ev.stats.combined_usd;
        acc.expenses_usd += ev.stats.expenses_combined_usd;
        acc.net_surplus_usd += ev.stats.net_surplus_usd;
        acc.pending_online_count += ev.stats.pending_online_count;
        return acc;
      },
      {
        total_events: 0,
        total_entries: 0,
        sum_usd: 0,
        sum_khr: 0,
        combined_usd: 0,
        expenses_usd: 0,
        net_surplus_usd: 0,
        pending_online_count: 0,
      }
    );

    const outgoingTotals = outgoing.reduce(
      (acc, g) => {
        const rate = g.exchange_rate > 0 ? g.exchange_rate : 4000;
        acc.count += 1;
        acc.combined_usd += Number(g.amount_usd || 0) + Number(g.amount_khr || 0) / rate;
        return acc;
      },
      { count: 0, combined_usd: 0 }
    );

    return {
      events,
      globalTotals: {
        ...globalTotals,
        combined_usd: Math.round(globalTotals.combined_usd * 100) / 100,
        expenses_usd: Math.round(globalTotals.expenses_usd * 100) / 100,
        net_surplus_usd: Math.round(globalTotals.net_surplus_usd * 100) / 100,
        outgoing_count: outgoingTotals.count,
        outgoing_combined_usd: Math.round(outgoingTotals.combined_usd * 100) / 100,
      },
      outgoingGifts: outgoing,
      reciprocityDirectory: buildReciprocityDirectory(state),
      recentContributions,
      auditLogs,
    };
  }

  // 2. GET /api/events/:id/workspace
  const wsMatch = pathname.match(/^\/api\/events\/(\d+)\/workspace$/);
  if (method === 'GET' && wsMatch) {
    const eventId = Number(wsMatch[1]);
    const events = computeEventSummaries(state);
    const event = events.find((e) => Number(e.id) === eventId);
    if (!event) throw new Error('រកមិនឃើញកម្មវិធីនេះទេ');

    const contributions = state.contributions
      .filter((c) => Number(c.event_id) === eventId)
      .sort((a, b) => b.id - a.id);

    const invitations = state.invitations
      .filter((i) => Number(i.event_id) === eventId)
      .sort((a, b) => String(a.table_number || '').localeCompare(String(b.table_number || '')) || b.id - a.id);

    const expenses = state.expenses
      .filter((ex) => Number(ex.event_id) === eventId)
      .sort((a, b) => b.id - a.id);

    const cashRow = state.cash_counts.find((cc) => Number(cc.event_id) === eventId);
    let cashCount = null;
    if (cashRow) {
      try {
        cashCount = {
          ...cashRow,
          denominations: JSON.parse(cashRow.denominations_json || '{}'),
        };
      } catch {
        cashCount = { ...cashRow, denominations: {} };
      }
    }

    return { event, contributions, invitations, expenses, cashCount };
  }

  // 3. POST /api/events
  if (method === 'POST' && pathname === '/api/events') {
    if (!body.title || !String(body.title).trim()) {
      throw new Error('សូមបញ្ចូលឈ្មោះកម្មវិធី');
    }
    const id = nextId(state.events);
    const code =
      body.code ||
      `EVT-${new Date().getFullYear()}-${String(id + Math.floor(Math.random() * 90)).padStart(3, '0')}`;
    const now = nowTimestamp();

    const newEv = {
      id,
      code,
      title: String(body.title).trim(),
      event_type: body.event_type || 'wedding',
      host_names: body.host_names || '',
      parent_names: body.parent_names || '',
      event_date: body.event_date || new Date().toISOString().slice(0, 10),
      event_time: body.event_time || '17:00',
      location_name: body.location_name || '',
      province: body.province || 'សៀមរាប',
      address: body.address || '',
      map_link: body.map_link || '',
      exchange_rate: Number(body.exchange_rate) || 4000,
      target_budget_usd: Number(body.target_budget_usd) || 0,
      expected_guests: Number(body.expected_guests) || 200,
      total_tables: Number(body.total_tables) || 20,
      seats_per_table: Number(body.seats_per_table) || 10,
      price_per_table_usd: Number(body.price_per_table_usd) || 150,
      khqr_aba_name: body.khqr_aba_name || '',
      khqr_aba_account: body.khqr_aba_account || '',
      khqr_acleda_account: body.khqr_acleda_account || '',
      khqr_wing_account: body.khqr_wing_account || '',
      greeting_message:
        body.greeting_message ||
        'សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមាន និងចំណងដៃដ៏ថ្លៃថ្លារបស់លោកអ្នក!',
      status: body.status || 'active',
      theme_color: body.theme_color || 'amber',
      created_at: now,
      updated_at: now,
    };

    state.events.push(newEv);
    logAudit(state, id, 'CREATE_EVENT', body.actor || 'ម្ចាស់កម្មវិធី', `បង្កើតកម្មវិធីថ្មី៖ ${newEv.title}`);
    await persistState(state);
    return computeEventSummaries(state).find((e) => e.id === id);
  }

  // 4 & 5. PUT / DELETE /api/events/:id
  const evIdMatch = pathname.match(/^\/api\/events\/(\d+)$/);
  if (evIdMatch) {
    const eventId = Number(evIdMatch[1]);
    const idx = state.events.findIndex((e) => Number(e.id) === eventId);
    if (idx === -1) throw new Error('រកមិនឃើញកម្មវិធី');

    if (method === 'PUT') {
      const existing = state.events[idx];
      state.events[idx] = {
        ...existing,
        ...body,
        id: eventId,
        exchange_rate: Number(body.exchange_rate ?? existing.exchange_rate) || 4000,
        target_budget_usd: Number(body.target_budget_usd ?? existing.target_budget_usd) || 0,
        expected_guests: Number(body.expected_guests ?? existing.expected_guests) || 0,
        total_tables: Number(body.total_tables ?? existing.total_tables) || 10,
        seats_per_table: Number(body.seats_per_table ?? existing.seats_per_table) || 10,
        price_per_table_usd: Number(body.price_per_table_usd ?? existing.price_per_table_usd) || 0,
        updated_at: nowTimestamp(),
      };
      logAudit(state, eventId, 'UPDATE_EVENT', 'ម្ចាស់កម្មវិធី', `កែប្រែព័ត៌មានកម្មវិធី៖ ${state.events[idx].title}`);
      await persistState(state);
      return computeEventSummaries(state).find((e) => e.id === eventId);
    }

    if (method === 'DELETE') {
      const title = state.events[idx].title;
      state.events.splice(idx, 1);
      state.contributions = state.contributions.filter((c) => Number(c.event_id) !== eventId);
      state.invitations = state.invitations.filter((i) => Number(i.event_id) !== eventId);
      state.expenses = state.expenses.filter((ex) => Number(ex.event_id) !== eventId);
      state.cash_counts = state.cash_counts.filter((cc) => Number(cc.event_id) !== eventId);
      logAudit(state, null, 'DELETE_EVENT', 'ម្ចាស់កម្មវិធី', `លុបកម្មវិធី៖ ${title}`);
      await persistState(state);
      return { success: true };
    }
  }

  // 6. POST /api/events/:eventId/contributions
  const createContribMatch = pathname.match(/^\/api\/events\/(\d+)\/contributions$/);
  if (method === 'POST' && createContribMatch) {
    const eventId = Number(createContribMatch[1]);
    if (!body.guest_name || !String(body.guest_name).trim()) {
      throw new Error('សូមបញ្ចូលឈ្មោះភ្ញៀវ');
    }
    const receiptNo =
      body.receipt_no && String(body.receipt_no).trim()
        ? String(body.receipt_no).trim()
        : getNextReceiptNo(state, eventId);

    const amountUsd = Math.max(0, Number(body.amount_usd) || 0);
    const amountKhr = Math.max(0, Number(body.amount_khr) || 0);
    const giftEst = Math.max(0, Number(body.gift_estimated_usd) || 0);

    let invitationId = body.invitation_id ? Number(body.invitation_id) : null;
    if (!invitationId) {
      const matched = state.invitations.find(
        (inv) =>
          Number(inv.event_id) === eventId &&
          inv.guest_name.trim().toLowerCase() === String(body.guest_name).trim().toLowerCase()
      );
      if (matched) invitationId = matched.id;
    }

    if (invitationId) {
      const invObj = state.invitations.find((i) => Number(i.id) === invitationId);
      if (invObj) invObj.rsvp_status = 'attended';
    }

    const now = nowTimestamp();
    const created = {
      id: nextId(state.contributions),
      event_id: eventId,
      receipt_no: receiptNo,
      envelope_no: body.envelope_no || `E-${receiptNo}`,
      guest_title: body.guest_title || 'លោក',
      guest_name: String(body.guest_name).trim(),
      guest_phone: body.guest_phone || '',
      guest_location: body.guest_location || '',
      guest_group: body.guest_group || 'friends',
      side: body.side || 'both',
      amount_usd: amountUsd,
      amount_khr: amountKhr,
      payment_method: body.payment_method || 'cash',
      payment_ref: body.payment_ref || '',
      gift_description: body.gift_description || '',
      gift_estimated_usd: giftEst,
      table_number: body.table_number || '',
      pax_count: Math.max(0, Number(body.pax_count ?? 1)),
      blessing_note: body.blessing_note || '',
      recorded_by: body.recorded_by || 'តុទទួលភ្ញៀវទី១',
      verification_status: body.verification_status || 'verified',
      invitation_id: invitationId,
      created_at: now,
      updated_at: now,
    };

    state.contributions.push(created);
    logAudit(
      state,
      eventId,
      'CREATE_CONTRIBUTION',
      created.recorded_by,
      `កត់ត្រាចំណងដៃ #${created.receipt_no}៖ ${created.guest_title} ${created.guest_name} ($${amountUsd} / ${amountKhr.toLocaleString()}៛)`
    );
    await persistState(state);
    return created;
  }

  // 7. POST /api/public/events/:eventId/contribute
  const pubContribMatch = pathname.match(/^\/api\/public\/events\/(\d+)\/contribute$/);
  if (method === 'POST' && pubContribMatch) {
    const eventId = Number(pubContribMatch[1]);
    if (!body.guest_name || !String(body.guest_name).trim()) {
      throw new Error('សូមបញ្ចូលឈ្មោះរបស់លោកអ្នក');
    }
    const receiptNo = getNextReceiptNo(state, eventId);
    const amountUsd = Math.max(0, Number(body.amount_usd) || 0);
    const amountKhr = Math.max(0, Number(body.amount_khr) || 0);
    const now = nowTimestamp();

    const created = {
      id: nextId(state.contributions),
      event_id: eventId,
      receipt_no: receiptNo,
      envelope_no: `ONL-${receiptNo}`,
      guest_title: body.guest_title || 'លោក',
      guest_name: String(body.guest_name).trim(),
      guest_phone: body.guest_phone || '',
      guest_location: body.guest_location || '',
      guest_group: body.guest_group || 'friends',
      side: body.side || 'both',
      amount_usd: amountUsd,
      amount_khr: amountKhr,
      payment_method: body.payment_method || 'aba_khqr',
      payment_ref: body.payment_ref || `KHQR-${Date.now().toString().slice(-6)}`,
      gift_description: '',
      gift_estimated_usd: 0,
      table_number: '',
      pax_count: 0,
      blessing_note: body.blessing_note || '',
      recorded_by: 'ធៀបឌីជីថលអនឡាញ (KHQR)',
      verification_status: 'pending_online',
      invitation_id: null,
      created_at: now,
      updated_at: now,
    };

    state.contributions.push(created);
    logAudit(
      state,
      eventId,
      'ONLINE_CONTRIBUTION',
      'ធៀបឌីជីថលអនឡាញ',
      `ភ្ញៀវផ្ញើចំណងដៃអនឡាញ #${created.receipt_no}៖ ${created.guest_title} ${created.guest_name}`
    );
    await persistState(state);
    return created;
  }

  // 8 & 10. PUT / DELETE /api/contributions/:id
  const contribIdMatch = pathname.match(/^\/api\/contributions\/(\d+)$/);
  if (contribIdMatch) {
    const id = Number(contribIdMatch[1]);
    const idx = state.contributions.findIndex((c) => Number(c.id) === id);
    if (idx === -1) throw new Error('រកមិនឃើញកំណត់ត្រាចំណងដៃ');

    if (method === 'PUT') {
      const existing = state.contributions[idx];
      const updated = {
        ...existing,
        ...body,
        id,
        guest_name: body.guest_name ? String(body.guest_name).trim() : existing.guest_name,
        amount_usd: Math.max(0, Number(body.amount_usd ?? existing.amount_usd) || 0),
        amount_khr: Math.max(0, Number(body.amount_khr ?? existing.amount_khr) || 0),
        gift_estimated_usd: Math.max(0, Number(body.gift_estimated_usd ?? existing.gift_estimated_usd) || 0),
        updated_at: nowTimestamp(),
      };
      state.contributions[idx] = updated;
      logAudit(state, existing.event_id, 'UPDATE_CONTRIBUTION', updated.recorded_by, `កែប្រែកំណត់ត្រា #${updated.receipt_no}`);
      await persistState(state);
      return updated;
    }

    if (method === 'DELETE') {
      const existing = state.contributions[idx];
      state.contributions.splice(idx, 1);
      logAudit(state, existing.event_id, 'DELETE_CONTRIBUTION', 'អ្នកកត់ត្រា', `លុបកំណត់ត្រា #${existing.receipt_no} (${existing.guest_name})`);
      await persistState(state);
      return { success: true };
    }
  }

  // 9. PATCH /api/contributions/:id/verify
  const verifyMatch = pathname.match(/^\/api\/contributions\/(\d+)\/verify$/);
  if (method === 'PATCH' && verifyMatch) {
    const id = Number(verifyMatch[1]);
    const row = state.contributions.find((c) => Number(c.id) === id);
    if (!row) throw new Error('រកមិនឃើញកំណត់ត្រា');
    row.verification_status = 'verified';
    row.updated_at = nowTimestamp();
    logAudit(state, row.event_id, 'VERIFY_CONTRIBUTION', 'ម្ចាស់កម្មវិធី', `បានផ្ទៀងផ្ទាត់ចំណងដៃអនឡាញ #${row.receipt_no}`);
    await persistState(state);
    return row;
  }

  // 11. POST /api/events/:eventId/contributions/import
  const importMatch = pathname.match(/^\/api\/events\/(\d+)\/contributions\/import$/);
  if (method === 'POST' && importMatch) {
    const eventId = Number(importMatch[1]);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    let imported = 0;
    const now = nowTimestamp();

    for (const r of rows) {
      if (!r.guest_name || !String(r.guest_name).trim()) continue;
      const receiptNo = r.receipt_no || getNextReceiptNo(state, eventId);
      state.contributions.push({
        id: nextId(state.contributions),
        event_id: eventId,
        receipt_no: receiptNo,
        envelope_no: r.envelope_no || `IMP-${receiptNo}`,
        guest_title: r.guest_title || 'លោក',
        guest_name: String(r.guest_name).trim(),
        guest_phone: r.guest_phone || '',
        guest_location: r.guest_location || '',
        guest_group: r.guest_group || 'friends',
        side: r.side || 'both',
        amount_usd: Math.max(0, Number(r.amount_usd) || 0),
        amount_khr: Math.max(0, Number(r.amount_khr) || 0),
        payment_method: r.payment_method || 'cash',
        payment_ref: r.payment_ref || '',
        gift_description: r.gift_description || '',
        gift_estimated_usd: Math.max(0, Number(r.gift_estimated_usd) || 0),
        table_number: r.table_number || '',
        pax_count: Math.max(1, Number(r.pax_count) || 1),
        blessing_note: r.blessing_note || '',
        recorded_by: r.recorded_by || 'នាំចូលពីឯកសារ CSV',
        verification_status: 'verified',
        invitation_id: null,
        created_at: now,
        updated_at: now,
      });
      imported++;
    }

    logAudit(state, eventId, 'IMPORT_CSV', 'ម្ចាស់កម្មវិធី', `នាំចូលបញ្ជីចំណងដៃចំនួន ${imported} កំណត់ត្រា`);
    await persistState(state);
    return { imported };
  }

  // 12. Invitations CRUD
  const createInvMatch = pathname.match(/^\/api\/events\/(\d+)\/invitations$/);
  if (method === 'POST' && createInvMatch) {
    const eventId = Number(createInvMatch[1]);
    if (!body.guest_name || !String(body.guest_name).trim()) {
      throw new Error('សូមបញ្ចូលឈ្មោះភ្ញៀវអញ្ជើញ');
    }
    const created = {
      id: nextId(state.invitations),
      event_id: eventId,
      invite_code: `INV-${eventId}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      guest_title: body.guest_title || 'លោក',
      guest_name: String(body.guest_name).trim(),
      guest_phone: body.guest_phone || '',
      guest_location: body.guest_location || '',
      guest_group: body.guest_group || 'friends',
      side: body.side || 'both',
      table_number: body.table_number || '',
      seats_reserved: Math.max(1, Number(body.seats_reserved) || 2),
      card_delivered: body.card_delivered !== undefined ? (body.card_delivered ? 1 : 0) : 1,
      rsvp_status: body.rsvp_status || 'invited',
      expected_chongdai_note: body.expected_chongdai_note || '',
      notes: body.notes || '',
      created_at: nowTimestamp(),
    };
    state.invitations.push(created);
    await persistState(state);
    return created;
  }

  const invIdMatch = pathname.match(/^\/api\/invitations\/(\d+)$/);
  if (invIdMatch) {
    const id = Number(invIdMatch[1]);
    const idx = state.invitations.findIndex((i) => Number(i.id) === id);
    if (idx === -1) throw new Error('រកមិនឃើញភ្ញៀវអញ្ជើញ');

    if (method === 'PUT') {
      const ex = state.invitations[idx];
      state.invitations[idx] = {
        ...ex,
        ...body,
        id,
        card_delivered:
          body.card_delivered !== undefined ? (body.card_delivered ? 1 : 0) : ex.card_delivered,
      };
      await persistState(state);
      return state.invitations[idx];
    }

    if (method === 'DELETE') {
      state.invitations.splice(idx, 1);
      await persistState(state);
      return { success: true };
    }
  }

  // 13. Expenses CRUD
  const createExpMatch = pathname.match(/^\/api\/events\/(\d+)\/expenses$/);
  if (method === 'POST' && createExpMatch) {
    const eventId = Number(createExpMatch[1]);
    const totUsd = Math.max(0, Number(body.total_amount_usd) || 0);
    const totKhr = Math.max(0, Number(body.total_amount_khr) || 0);
    const paidUsd = Math.max(0, Number(body.paid_amount_usd ?? totUsd) || 0);
    const paidKhr = Math.max(0, Number(body.paid_amount_khr ?? totKhr) || 0);

    let status = 'paid';
    if (paidUsd === 0 && paidKhr === 0 && (totUsd > 0 || totKhr > 0)) status = 'unpaid';
    else if (paidUsd < totUsd || paidKhr < totKhr) status = 'partial';

    const created = {
      id: nextId(state.expenses),
      event_id: eventId,
      category: body.category || 'catering',
      item_name: String(body.item_name || '').trim(),
      vendor_name: body.vendor_name || '',
      vendor_phone: body.vendor_phone || '',
      total_amount_usd: totUsd,
      total_amount_khr: totKhr,
      paid_amount_usd: paidUsd,
      paid_amount_khr: paidKhr,
      payment_status: status,
      expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
      notes: body.notes || '',
      created_at: nowTimestamp(),
    };
    state.expenses.push(created);
    await persistState(state);
    return created;
  }

  const expIdMatch = pathname.match(/^\/api\/expenses\/(\d+)$/);
  if (expIdMatch) {
    const id = Number(expIdMatch[1]);
    const idx = state.expenses.findIndex((ex) => Number(ex.id) === id);
    if (idx === -1) throw new Error('រកមិនឃើញកំណត់ត្រាចំណាយ');

    if (method === 'PUT') {
      const existing = state.expenses[idx];
      const totUsd = Math.max(0, Number(body.total_amount_usd ?? existing.total_amount_usd) || 0);
      const totKhr = Math.max(0, Number(body.total_amount_khr ?? existing.total_amount_khr) || 0);
      const paidUsd = Math.max(0, Number(body.paid_amount_usd ?? existing.paid_amount_usd) || 0);
      const paidKhr = Math.max(0, Number(body.paid_amount_khr ?? existing.paid_amount_khr) || 0);

      let status = 'paid';
      if (paidUsd === 0 && paidKhr === 0 && (totUsd > 0 || totKhr > 0)) status = 'unpaid';
      else if (paidUsd < totUsd || paidKhr < totKhr) status = 'partial';

      state.expenses[idx] = {
        ...existing,
        ...body,
        id,
        total_amount_usd: totUsd,
        total_amount_khr: totKhr,
        paid_amount_usd: paidUsd,
        paid_amount_khr: paidKhr,
        payment_status: status,
      };
      await persistState(state);
      return state.expenses[idx];
    }

    if (method === 'DELETE') {
      state.expenses.splice(idx, 1);
      await persistState(state);
      return { success: true };
    }
  }

  // 14. Cash Count Save
  const cashCountMatch = pathname.match(/^\/api\/events\/(\d+)\/cash-count$/);
  if (method === 'PUT' && cashCountMatch) {
    const eventId = Number(cashCountMatch[1]);
    const denominations_json = JSON.stringify(body.denominations || {});
    const existingIdx = state.cash_counts.findIndex((cc) => Number(cc.event_id) === eventId);
    const record = {
      id: existingIdx >= 0 ? state.cash_counts[existingIdx].id : nextId(state.cash_counts),
      event_id: eventId,
      denominations_json,
      counted_by: body.counted_by || 'គណៈកម្មការរាប់ប្រាក់',
      notes: body.notes || '',
      updated_at: nowTimestamp(),
    };
    if (existingIdx >= 0) state.cash_counts[existingIdx] = record;
    else state.cash_counts.push(record);

    logAudit(state, eventId, 'SAVE_CASH_COUNT', record.counted_by, 'បានរក្សាទុកការរាប់សាច់ប្រាក់ក្នុងហិប');
    await persistState(state);
    return { ...record, denominations: body.denominations || {} };
  }

  // 15. Outgoing Gifts CRUD
  if (method === 'POST' && pathname === '/api/outgoing-gifts') {
    const created = {
      id: nextId(state.outgoing_gifts),
      recipient_title: body.recipient_title || 'លោក',
      recipient_name: String(body.recipient_name || '').trim(),
      recipient_phone: body.recipient_phone || '',
      recipient_location: body.recipient_location || '',
      relationship: body.relationship || 'friends',
      event_type: body.event_type || 'wedding',
      event_title: body.event_title || 'ពិធីមង្គលការ',
      event_date: body.event_date || new Date().toISOString().slice(0, 10),
      amount_usd: Math.max(0, Number(body.amount_usd) || 0),
      amount_khr: Math.max(0, Number(body.amount_khr) || 0),
      exchange_rate: Number(body.exchange_rate) || 4000,
      payment_method: body.payment_method || 'cash',
      gift_description: body.gift_description || '',
      returned_status: body.returned_status || 'pending_return',
      notes: body.notes || '',
      created_at: nowTimestamp(),
    };
    state.outgoing_gifts.push(created);
    await persistState(state);
    return created;
  }

  const outIdMatch = pathname.match(/^\/api\/outgoing-gifts\/(\d+)$/);
  if (outIdMatch) {
    const id = Number(outIdMatch[1]);
    const idx = state.outgoing_gifts.findIndex((g) => Number(g.id) === id);
    if (idx === -1) throw new Error('រកមិនឃើញកំណត់ត្រា');

    if (method === 'PUT') {
      state.outgoing_gifts[idx] = {
        ...state.outgoing_gifts[idx],
        ...body,
        id,
        amount_usd: Math.max(0, Number(body.amount_usd ?? state.outgoing_gifts[idx].amount_usd) || 0),
        amount_khr: Math.max(0, Number(body.amount_khr ?? state.outgoing_gifts[idx].amount_khr) || 0),
      };
      await persistState(state);
      return state.outgoing_gifts[idx];
    }

    if (method === 'DELETE') {
      state.outgoing_gifts.splice(idx, 1);
      await persistState(state);
      return { success: true };
    }
  }

  // 16. QR Code Generator (Pure Browser Canvas QRCode!)
  if (method === 'GET' && pathname === '/api/qrcode') {
    const text = urlObj.searchParams.get('text') || 'Katchongdai Cambodia';
    const colorDark = urlObj.searchParams.get('dark') || '#1e1b4b';
    const dataUrl = await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: { dark: colorDark, light: '#ffffff' },
    });
    return { dataUrl };
  }

  // 17. System Export / Import / Reset / Clear
  if (method === 'GET' && pathname === '/api/system/export-json') {
    return {
      app: 'Katchongdai Pro',
      version: '2.1.0',
      exported_at: new Date().toISOString(),
      events: state.events,
      contributions: state.contributions,
      invitations: state.invitations,
      expenses: state.expenses,
      outgoing_gifts: state.outgoing_gifts,
      cash_counts: state.cash_counts,
    };
  }

  if (method === 'POST' && pathname === '/api/system/import-json') {
    if (!Array.isArray(body.events)) {
      throw new Error('ទម្រង់ឯកសារបម្រុងទុកមិនត្រឹមត្រូវទេ');
    }
    const restored = {
      events: body.events || [],
      contributions: body.contributions || [],
      invitations: body.invitations || [],
      expenses: body.expenses || [],
      outgoing_gifts: body.outgoing_gifts || [],
      cash_counts: body.cash_counts || [],
      audit_logs: [
        {
          id: 1,
          event_id: null,
          action: 'RESTORE_BACKUP',
          actor: 'ម្ចាស់កម្មវិធី',
          summary: `បានស្ដារទិន្នន័យបម្រុងទុកឡើងវិញ (${body.events.length} កម្មវិធី)`,
          created_at: nowTimestamp(),
        },
      ],
    };
    await persistState(restored);
    return { success: true };
  }

  if (method === 'POST' && pathname === '/api/system/reset-demo') {
    const freshDemo = createDemoSeedState();
    await persistState(freshDemo);
    return { success: true };
  }

  if (method === 'POST' && pathname === '/api/system/clear-all') {
    const cleared = {
      events: [],
      contributions: [],
      invitations: [],
      expenses: [],
      outgoing_gifts: [],
      cash_counts: [],
      audit_logs: [
        {
          id: 1,
          event_id: null,
          action: 'CLEAR_ALL',
          actor: 'ម្ចាស់កម្មវិធី',
          summary: 'បានសម្អាតទិន្នន័យទាំងអស់ដើម្បីចាប់ផ្តើមថ្មី',
          created_at: nowTimestamp(),
        },
      ],
    };
    await persistState(cleared);
    return { success: true };
  }

  throw new Error(`មិនស្គាល់សំណើប្រព័ន្ធ៖ ${method} ${pathname}`);
}
