import express from 'express';
import QRCode from 'qrcode';
import { db, logAudit, seedDemoData, clearAllData } from './db.js';

export const apiRouter = express.Router();

function computeEventSummaries() {
  const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC, id DESC').all();

  const contribAggStmt = db.prepare(`
    SELECT
      COUNT(*) as total_entries,
      COALESCE(SUM(pax_count), 0) as total_pax,
      COALESCE(SUM(amount_usd), 0) as sum_usd,
      COALESCE(SUM(amount_khr), 0) as sum_khr,
      COALESCE(SUM(gift_estimated_usd), 0) as sum_gift_usd,
      COALESCE(SUM(CASE WHEN verification_status = 'pending_online' THEN 1 ELSE 0 END), 0) as pending_online_count,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_usd ELSE 0 END), 0) as cash_usd,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_khr ELSE 0 END), 0) as cash_khr,
      COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN amount_usd ELSE 0 END), 0) as digital_usd,
      COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN amount_khr ELSE 0 END), 0) as digital_khr
    FROM contributions
    WHERE event_id = ?
  `);

  const expAggStmt = db.prepare(`
    SELECT
      COUNT(*) as expense_items,
      COALESCE(SUM(total_amount_usd), 0) as total_exp_usd,
      COALESCE(SUM(total_amount_khr), 0) as total_exp_khr,
      COALESCE(SUM(paid_amount_usd), 0) as paid_exp_usd,
      COALESCE(SUM(paid_amount_khr), 0) as paid_exp_khr
    FROM expenses
    WHERE event_id = ?
  `);

  const invAggStmt = db.prepare(`
    SELECT
      COUNT(*) as total_invites,
      COALESCE(SUM(seats_reserved), 0) as total_seats,
      COALESCE(SUM(CASE WHEN rsvp_status = 'attended' THEN 1 ELSE 0 END), 0) as attended_count,
      COALESCE(SUM(CASE WHEN rsvp_status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed_count,
      COALESCE(SUM(CASE WHEN card_delivered = 1 THEN 1 ELSE 0 END), 0) as delivered_count
    FROM invitations
    WHERE event_id = ?
  `);

  return events.map((ev) => {
    const rate = ev.exchange_rate > 0 ? ev.exchange_rate : 4000;
    const c = contribAggStmt.get(ev.id);
    const ex = expAggStmt.get(ev.id);
    const inv = invAggStmt.get(ev.id);

    const combined_usd = Number(c.sum_usd) + Number(c.sum_khr) / rate;
    const combined_khr = Number(c.sum_khr) + Number(c.sum_usd) * rate;
    const expenses_combined_usd = Number(ex.total_exp_usd) + Number(ex.total_exp_khr) / rate;
    const paid_expenses_combined_usd = Number(ex.paid_exp_usd) + Number(ex.paid_exp_khr) / rate;
    const net_surplus_usd = combined_usd - expenses_combined_usd;

    return {
      ...ev,
      stats: {
        total_entries: Number(c.total_entries),
        total_pax: Number(c.total_pax),
        sum_usd: Number(c.sum_usd),
        sum_khr: Number(c.sum_khr),
        sum_gift_usd: Number(c.sum_gift_usd),
        combined_usd: Math.round(combined_usd * 100) / 100,
        combined_khr: Math.round(combined_khr),
        cash_usd: Number(c.cash_usd),
        cash_khr: Number(c.cash_khr),
        digital_usd: Number(c.digital_usd),
        digital_khr: Number(c.digital_khr),
        pending_online_count: Number(c.pending_online_count),
        expense_items: Number(ex.expense_items),
        expenses_combined_usd: Math.round(expenses_combined_usd * 100) / 100,
        paid_expenses_combined_usd: Math.round(paid_expenses_combined_usd * 100) / 100,
        unpaid_expenses_usd: Math.round((expenses_combined_usd - paid_expenses_combined_usd) * 100) / 100,
        net_surplus_usd: Math.round(net_surplus_usd * 100) / 100,
        total_invites: Number(inv.total_invites),
        total_seats: Number(inv.total_seats),
        attended_count: Number(inv.attended_count),
        confirmed_count: Number(inv.confirmed_count),
        delivered_count: Number(inv.delivered_count),
      },
    };
  });
}

function buildReciprocityDirectory() {
  const incoming = db.prepare(`
    SELECT c.*, e.title as event_title, e.event_type, e.event_date, e.exchange_rate
    FROM contributions c
    JOIN events e ON e.id = c.event_id
    ORDER BY c.created_at DESC
  `).all();

  const outgoing = db.prepare(`
    SELECT * FROM outgoing_gifts ORDER BY event_date DESC, id DESC
  `).all();

  const invites = db.prepare(`
    SELECT i.*, e.title as event_title
    FROM invitations i
    JOIN events e ON e.id = i.event_id
  `).all();

  const map = new Map();
  const norm = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

  for (const row of incoming) {
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
    const rate = row.exchange_rate > 0 ? row.exchange_rate : 4000;
    const eq = Number(row.amount_usd) + Number(row.amount_khr) / rate;
    entry.incoming_total_usd_equiv += eq;
    entry.incoming_records.push({
      id: row.id,
      event_id: row.event_id,
      event_title: row.event_title,
      event_type: row.event_type,
      event_date: row.event_date,
      receipt_no: row.receipt_no,
      amount_usd: Number(row.amount_usd),
      amount_khr: Number(row.amount_khr),
      usd_equiv: Math.round(eq * 100) / 100,
      gift_description: row.gift_description,
      payment_method: row.payment_method,
    });
  }

  for (const row of outgoing) {
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
    const eq = Number(row.amount_usd) + Number(row.amount_khr) / rate;
    entry.outgoing_total_usd_equiv += eq;
    entry.outgoing_records.push({
      id: row.id,
      event_title: row.event_title,
      event_type: row.event_type,
      event_date: row.event_date,
      amount_usd: Number(row.amount_usd),
      amount_khr: Number(row.amount_khr),
      usd_equiv: Math.round(eq * 100) / 100,
      gift_description: row.gift_description,
      returned_status: row.returned_status,
      notes: row.notes,
    });
  }

  for (const inv of invites) {
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
      event_title: inv.event_title,
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
      // Recommended return gift if they gave us more than we gave them:
      const suggested_return_usd = inc > out ? Math.ceil((inc - out + 10) / 5) * 5 : Math.max(20, out);
      return {
        ...p,
        incoming_total_usd_equiv: inc,
        outgoing_total_usd_equiv: out,
        net_balance_usd: net,
        suggested_return_usd,
      };
    })
    .sort((a, b) => (b.incoming_total_usd_equiv + b.outgoing_total_usd_equiv) - (a.incoming_total_usd_equiv + a.outgoing_total_usd_equiv));
}

// 1. Bootstrap endpoint
apiRouter.get('/bootstrap', (req, res) => {
  const events = computeEventSummaries();
  const outgoing = db.prepare('SELECT * FROM outgoing_gifts ORDER BY event_date DESC, id DESC').all();
  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 40').all();
  const recentContributions = db.prepare(`
    SELECT c.*, e.title as event_title, e.event_type, e.exchange_rate
    FROM contributions c
    JOIN events e ON e.id = c.event_id
    ORDER BY c.id DESC
    LIMIT 15
  `).all();

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
      acc.sum_usd += Number(g.amount_usd);
      acc.sum_khr += Number(g.amount_khr);
      acc.combined_usd += Number(g.amount_usd) + Number(g.amount_khr) / rate;
      return acc;
    },
    { count: 0, sum_usd: 0, sum_khr: 0, combined_usd: 0 }
  );

  res.json({
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
    reciprocityDirectory: buildReciprocityDirectory(),
    recentContributions,
    auditLogs,
  });
});

// 2. Full Single Event Workspace Payload
apiRouter.get('/events/:id/workspace', (req, res) => {
  const eventId = Number(req.params.id);
  const events = computeEventSummaries();
  const event = events.find((e) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធីនេះទេ' });
  }

  const contributions = db
    .prepare('SELECT * FROM contributions WHERE event_id = ? ORDER BY id DESC')
    .all(eventId);
  const invitations = db
    .prepare('SELECT * FROM invitations WHERE event_id = ? ORDER BY table_number ASC, id DESC')
    .all(eventId);
  const expenses = db
    .prepare('SELECT * FROM expenses WHERE event_id = ? ORDER BY id DESC')
    .all(eventId);
  const cashCountRow = db
    .prepare('SELECT * FROM cash_counts WHERE event_id = ?')
    .get(eventId);

  let cashCount = null;
  if (cashCountRow) {
    try {
      cashCount = {
        ...cashCountRow,
        denominations: JSON.parse(cashCountRow.denominations_json || '{}'),
      };
    } catch {
      cashCount = { ...cashCountRow, denominations: {} };
    }
  }

  res.json({
    event,
    contributions,
    invitations,
    expenses,
    cashCount,
  });
});

// 3. Create Event
apiRouter.post('/events', (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះកម្មវិធី' });
  }
  const count = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  const code = b.code || `EVT-${new Date().getFullYear()}-${String(count + 1 + Math.floor(Math.random() * 90)).padStart(3, '0')}`;

  const result = db.prepare(`
    INSERT INTO events (
      code, title, event_type, host_names, parent_names, event_date, event_time,
      location_name, province, address, map_link, exchange_rate, target_budget_usd,
      expected_guests, total_tables, seats_per_table, price_per_table_usd,
      khqr_aba_name, khqr_aba_account, khqr_acleda_account, khqr_wing_account,
      greeting_message, status, theme_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code,
    String(b.title).trim(),
    b.event_type || 'wedding',
    b.host_names || '',
    b.parent_names || '',
    b.event_date || new Date().toISOString().slice(0, 10),
    b.event_time || '17:00',
    b.location_name || '',
    b.province || 'សៀមរាប',
    b.address || '',
    b.map_link || '',
    Number(b.exchange_rate) || 4000,
    Number(b.target_budget_usd) || 0,
    Number(b.expected_guests) || 200,
    Number(b.total_tables) || 20,
    Number(b.seats_per_table) || 10,
    Number(b.price_per_table_usd) || 150,
    b.khqr_aba_name || '',
    b.khqr_aba_account || '',
    b.khqr_acleda_account || '',
    b.khqr_wing_account || '',
    b.greeting_message || 'សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមាន និងចំណងដៃដ៏ថ្លៃថ្លារបស់លោកអ្នក!',
    b.status || 'active',
    b.theme_color || 'amber'
  );

  const newId = Number(result.lastInsertRowid);
  logAudit(newId, 'CREATE_EVENT', b.actor || 'ម្ចាស់កម្មវិធី', `បង្កើតកម្មវិធីថ្មី៖ ${b.title}`);
  const created = computeEventSummaries().find((e) => e.id === newId);
  res.status(201).json(created);
});

// 4. Update Event
apiRouter.put('/events/:id', (req, res) => {
  const eventId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធី' });

  const b = req.body || {};
  db.prepare(`
    UPDATE events SET
      title = ?, event_type = ?, host_names = ?, parent_names = ?,
      event_date = ?, event_time = ?, location_name = ?, province = ?,
      address = ?, map_link = ?, exchange_rate = ?, target_budget_usd = ?,
      expected_guests = ?, total_tables = ?, seats_per_table = ?, price_per_table_usd = ?,
      khqr_aba_name = ?, khqr_aba_account = ?, khqr_acleda_account = ?, khqr_wing_account = ?,
      greeting_message = ?, status = ?, theme_color = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.title ?? existing.title,
    b.event_type ?? existing.event_type,
    b.host_names ?? existing.host_names,
    b.parent_names ?? existing.parent_names,
    b.event_date ?? existing.event_date,
    b.event_time ?? existing.event_time,
    b.location_name ?? existing.location_name,
    b.province ?? existing.province,
    b.address ?? existing.address,
    b.map_link ?? existing.map_link,
    Number(b.exchange_rate ?? existing.exchange_rate) || 4000,
    Number(b.target_budget_usd ?? existing.target_budget_usd) || 0,
    Number(b.expected_guests ?? existing.expected_guests) || 0,
    Number(b.total_tables ?? existing.total_tables) || 10,
    Number(b.seats_per_table ?? existing.seats_per_table) || 10,
    Number(b.price_per_table_usd ?? existing.price_per_table_usd) || 0,
    b.khqr_aba_name ?? existing.khqr_aba_name,
    b.khqr_aba_account ?? existing.khqr_aba_account,
    b.khqr_acleda_account ?? existing.khqr_acleda_account,
    b.khqr_wing_account ?? existing.khqr_wing_account,
    b.greeting_message ?? existing.greeting_message,
    b.status ?? existing.status,
    b.theme_color ?? existing.theme_color,
    eventId
  );

  logAudit(eventId, 'UPDATE_EVENT', b.actor || 'ម្ចាស់កម្មវិធី', `កែប្រែព័ត៌មានកម្មវិធី៖ ${b.title || existing.title}`);
  const updated = computeEventSummaries().find((e) => e.id === eventId);
  res.json(updated);
});

// 5. Delete Event
apiRouter.delete('/events/:id', (req, res) => {
  const eventId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធី' });

  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  logAudit(null, 'DELETE_EVENT', 'ម្ចាស់កម្មវិធី', `លុបកម្មវិធី៖ ${existing.title}`);
  res.json({ success: true });
});

// Helper for next receipt number
function getNextReceiptNo(eventId) {
  const rows = db.prepare('SELECT receipt_no FROM contributions WHERE event_id = ?').all(eventId);
  let maxNum = 0;
  for (const r of rows) {
    const n = parseInt(String(r.receipt_no).replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return String(maxNum + 1).padStart(4, '0');
}

// 6. Create Contribution (Chongdai Entry)
apiRouter.post('/events/:eventId/contributions', (req, res) => {
  const eventId = Number(req.params.eventId);
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!ev) return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធី' });

  const b = req.body || {};
  if (!b.guest_name || !String(b.guest_name).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះភ្ញៀវ' });
  }

  const receiptNo = b.receipt_no && String(b.receipt_no).trim()
    ? String(b.receipt_no).trim()
    : getNextReceiptNo(eventId);

  const amountUsd = Math.max(0, Number(b.amount_usd) || 0);
  const amountKhr = Math.max(0, Number(b.amount_khr) || 0);
  const giftEst = Math.max(0, Number(b.gift_estimated_usd) || 0);

  // Auto-match invitation if invitation_id not provided
  let invitationId = b.invitation_id ? Number(b.invitation_id) : null;
  if (!invitationId) {
    const matchedInvite = db.prepare(
      'SELECT id, table_number FROM invitations WHERE event_id = ? AND lower(trim(guest_name)) = lower(trim(?)) LIMIT 1'
    ).get(eventId, String(b.guest_name));
    if (matchedInvite) {
      invitationId = matchedInvite.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO contributions (
      event_id, receipt_no, envelope_no, guest_title, guest_name, guest_phone,
      guest_location, guest_group, side, amount_usd, amount_khr, payment_method,
      payment_ref, gift_description, gift_estimated_usd, table_number, pax_count,
      blessing_note, recorded_by, verification_status, invitation_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    eventId,
    receiptNo,
    b.envelope_no || `E-${receiptNo}`,
    b.guest_title || 'លោក',
    String(b.guest_name).trim(),
    b.guest_phone || '',
    b.guest_location || '',
    b.guest_group || 'friends',
    b.side || 'both',
    amountUsd,
    amountKhr,
    b.payment_method || 'cash',
    b.payment_ref || '',
    b.gift_description || '',
    giftEst,
    b.table_number || '',
    Math.max(0, Number(b.pax_count ?? 1)),
    b.blessing_note || '',
    b.recorded_by || 'តុទទួលភ្ញៀវទី១',
    b.verification_status || 'verified',
    invitationId
  );

  if (invitationId) {
    db.prepare(`UPDATE invitations SET rsvp_status = 'attended' WHERE id = ?`).run(invitationId);
  }

  const created = db.prepare('SELECT * FROM contributions WHERE id = ?').get(Number(result.lastInsertRowid));
  logAudit(
    eventId,
    'CREATE_CONTRIBUTION',
    created.recorded_by,
    `កត់ត្រាចំណងដៃ #${created.receipt_no}៖ ${created.guest_title} ${created.guest_name} ($${amountUsd} / ${amountKhr.toLocaleString()}៛)`
  );

  res.status(201).json(created);
});

// 7. Public / Online E-Invitation Contribution Submission
apiRouter.post('/public/events/:eventId/contribute', (req, res) => {
  const eventId = Number(req.params.eventId);
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!ev) return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធី' });

  const b = req.body || {};
  if (!b.guest_name || !String(b.guest_name).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះរបស់លោកអ្នក' });
  }

  const receiptNo = getNextReceiptNo(eventId);
  const amountUsd = Math.max(0, Number(b.amount_usd) || 0);
  const amountKhr = Math.max(0, Number(b.amount_khr) || 0);

  const result = db.prepare(`
    INSERT INTO contributions (
      event_id, receipt_no, envelope_no, guest_title, guest_name, guest_phone,
      guest_location, guest_group, side, amount_usd, amount_khr, payment_method,
      payment_ref, gift_description, gift_estimated_usd, table_number, pax_count,
      blessing_note, recorded_by, verification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, '', 0, ?, 'ធៀបឌីជីថលអនឡាញ (KHQR)', 'pending_online', datetime('now'), datetime('now'))
  `).run(
    eventId,
    receiptNo,
    `ONL-${receiptNo}`,
    b.guest_title || 'លោក',
    String(b.guest_name).trim(),
    b.guest_phone || '',
    b.guest_location || '',
    b.guest_group || 'friends',
    b.side || 'both',
    amountUsd,
    amountKhr,
    b.payment_method || 'aba_khqr',
    b.payment_ref || `KHQR-${Date.now().toString().slice(-6)}`,
    b.blessing_note || ''
  );

  const created = db.prepare('SELECT * FROM contributions WHERE id = ?').get(Number(result.lastInsertRowid));
  logAudit(
    eventId,
    'ONLINE_CONTRIBUTION',
    'ធៀបឌីជីថលអនឡាញ',
    `ភ្ញៀវផ្ញើចំណងដៃអនឡាញ #${created.receipt_no}៖ ${created.guest_title} ${created.guest_name} ($${amountUsd} / ${amountKhr.toLocaleString()}៛)`
  );
  res.status(201).json(created);
});

// 8. Update Contribution
apiRouter.put('/contributions/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកំណត់ត្រាចំណងដៃ' });

  const b = req.body || {};
  db.prepare(`
    UPDATE contributions SET
      receipt_no = ?, envelope_no = ?, guest_title = ?, guest_name = ?,
      guest_phone = ?, guest_location = ?, guest_group = ?, side = ?,
      amount_usd = ?, amount_khr = ?, payment_method = ?, payment_ref = ?,
      gift_description = ?, gift_estimated_usd = ?, table_number = ?, pax_count = ?,
      blessing_note = ?, recorded_by = ?, verification_status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.receipt_no ?? existing.receipt_no,
    b.envelope_no ?? existing.envelope_no,
    b.guest_title ?? existing.guest_title,
    b.guest_name ? String(b.guest_name).trim() : existing.guest_name,
    b.guest_phone ?? existing.guest_phone,
    b.guest_location ?? existing.guest_location,
    b.guest_group ?? existing.guest_group,
    b.side ?? existing.side,
    Math.max(0, Number(b.amount_usd ?? existing.amount_usd) || 0),
    Math.max(0, Number(b.amount_khr ?? existing.amount_khr) || 0),
    b.payment_method ?? existing.payment_method,
    b.payment_ref ?? existing.payment_ref,
    b.gift_description ?? existing.gift_description,
    Math.max(0, Number(b.gift_estimated_usd ?? existing.gift_estimated_usd) || 0),
    b.table_number ?? existing.table_number,
    Math.max(0, Number(b.pax_count ?? existing.pax_count)),
    b.blessing_note ?? existing.blessing_note,
    b.recorded_by ?? existing.recorded_by,
    b.verification_status ?? existing.verification_status,
    id
  );

  const updated = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  logAudit(
    existing.event_id,
    'UPDATE_CONTRIBUTION',
    b.actor || updated.recorded_by,
    `កែប្រែកំណត់ត្រា #${updated.receipt_no} (${updated.guest_title} ${updated.guest_name})`
  );
  res.json(updated);
});

// 9. Verify Online Contribution
apiRouter.patch('/contributions/:id/verify', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកំណត់ត្រា' });

  db.prepare(`UPDATE contributions SET verification_status = 'verified', updated_at = datetime('now') WHERE id = ?`).run(id);
  const updated = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  logAudit(
    existing.event_id,
    'VERIFY_CONTRIBUTION',
    req.body?.actor || 'ម្ចាស់កម្មវិធី',
    `បានផ្ទៀងផ្ទាត់ចំណងដៃអនឡាញ #${existing.receipt_no} របស់ ${existing.guest_name}`
  );
  res.json(updated);
});

// 10. Delete Contribution
apiRouter.delete('/contributions/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកំណត់ត្រា' });

  db.prepare('DELETE FROM contributions WHERE id = ?').run(id);
  logAudit(
    existing.event_id,
    'DELETE_CONTRIBUTION',
    req.query?.actor || 'អ្នកកត់ត្រា',
    `លុបកំណត់ត្រា #${existing.receipt_no} របស់ ${existing.guest_title} ${existing.guest_name} ($${existing.amount_usd} / ${existing.amount_khr}៛)`
  );
  res.json({ success: true });
});

// 11. Bulk Import Contributions (CSV/Excel rows)
apiRouter.post('/events/:eventId/contributions/import', (req, res) => {
  const eventId = Number(req.params.eventId);
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!ev) return res.status(404).json({ error: 'រកមិនឃើញកម្មវិធី' });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'មិនមានទិន្នន័យសម្រាប់នាំចូលទេ' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO contributions (
      event_id, receipt_no, envelope_no, guest_title, guest_name, guest_phone,
      guest_location, guest_group, side, amount_usd, amount_khr, payment_method,
      payment_ref, gift_description, gift_estimated_usd, table_number, pax_count,
      blessing_note, recorded_by, verification_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified')
  `);

  let imported = 0;
  db.exec('BEGIN');
  try {
    for (const r of rows) {
      if (!r.guest_name || !String(r.guest_name).trim()) continue;
      const receiptNo = getNextReceiptNo(eventId);
      insertStmt.run(
        eventId,
        r.receipt_no || receiptNo,
        r.envelope_no || `IMP-${receiptNo}`,
        r.guest_title || 'លោក',
        String(r.guest_name).trim(),
        r.guest_phone || '',
        r.guest_location || '',
        r.guest_group || 'friends',
        r.side || 'both',
        Math.max(0, Number(r.amount_usd) || 0),
        Math.max(0, Number(r.amount_khr) || 0),
        r.payment_method || 'cash',
        r.payment_ref || '',
        r.gift_description || '',
        Math.max(0, Number(r.gift_estimated_usd) || 0),
        r.table_number || '',
        Math.max(1, Number(r.pax_count) || 1),
        r.blessing_note || '',
        r.recorded_by || 'នាំចូលពីឯកសារ CSV'
      );
      imported++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }

  logAudit(eventId, 'IMPORT_CSV', req.body?.actor || 'ម្ចាស់កម្មវិធី', `នាំចូលបញ្ជីចំណងដៃចំនួន ${imported} កំណត់ត្រា`);
  res.json({ imported });
});

// 12. Invitations CRUD
apiRouter.post('/events/:eventId/invitations', (req, res) => {
  const eventId = Number(req.params.eventId);
  const b = req.body || {};
  if (!b.guest_name || !String(b.guest_name).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះភ្ញៀវអញ្ជើញ' });
  }
  const code = `INV-${eventId}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const result = db.prepare(`
    INSERT INTO invitations (
      event_id, invite_code, guest_title, guest_name, guest_phone, guest_location,
      guest_group, side, table_number, seats_reserved, card_delivered, rsvp_status,
      expected_chongdai_note, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    code,
    b.guest_title || 'លោក',
    String(b.guest_name).trim(),
    b.guest_phone || '',
    b.guest_location || '',
    b.guest_group || 'friends',
    b.side || 'both',
    b.table_number || '',
    Math.max(1, Number(b.seats_reserved) || 2),
    b.card_delivered !== undefined ? (b.card_delivered ? 1 : 0) : 1,
    b.rsvp_status || 'invited',
    b.expected_chongdai_note || '',
    b.notes || ''
  );

  const created = db.prepare('SELECT * FROM invitations WHERE id = ?').get(Number(result.lastInsertRowid));
  logAudit(eventId, 'CREATE_INVITATION', 'ម្ចាស់កម្មវិធី', `បន្ថែមឈ្មោះភ្ញៀវអញ្ជើញ៖ ${created.guest_title} ${created.guest_name}`);
  res.status(201).json(created);
});

apiRouter.put('/invitations/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM invitations WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញភ្ញៀវអញ្ជើញ' });

  const b = req.body || {};
  db.prepare(`
    UPDATE invitations SET
      guest_title = ?, guest_name = ?, guest_phone = ?, guest_location = ?,
      guest_group = ?, side = ?, table_number = ?, seats_reserved = ?,
      card_delivered = ?, rsvp_status = ?, expected_chongdai_note = ?, notes = ?
    WHERE id = ?
  `).run(
    b.guest_title ?? existing.guest_title,
    b.guest_name ? String(b.guest_name).trim() : existing.guest_name,
    b.guest_phone ?? existing.guest_phone,
    b.guest_location ?? existing.guest_location,
    b.guest_group ?? existing.guest_group,
    b.side ?? existing.side,
    b.table_number ?? existing.table_number,
    Math.max(1, Number(b.seats_reserved ?? existing.seats_reserved)),
    b.card_delivered !== undefined ? (b.card_delivered ? 1 : 0) : existing.card_delivered,
    b.rsvp_status ?? existing.rsvp_status,
    b.expected_chongdai_note ?? existing.expected_chongdai_note,
    b.notes ?? existing.notes,
    id
  );

  res.json(db.prepare('SELECT * FROM invitations WHERE id = ?').get(id));
});

apiRouter.delete('/invitations/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM invitations WHERE id = ?').run(id);
  res.json({ success: true });
});

// 13. Expenses CRUD
apiRouter.post('/events/:eventId/expenses', (req, res) => {
  const eventId = Number(req.params.eventId);
  const b = req.body || {};
  if (!b.item_name || !String(b.item_name).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះចំណាយ' });
  }

  const totUsd = Math.max(0, Number(b.total_amount_usd) || 0);
  const totKhr = Math.max(0, Number(b.total_amount_khr) || 0);
  const paidUsd = Math.max(0, Number(b.paid_amount_usd ?? totUsd) || 0);
  const paidKhr = Math.max(0, Number(b.paid_amount_khr ?? totKhr) || 0);

  let status = b.payment_status || 'paid';
  if (paidUsd === 0 && paidKhr === 0 && (totUsd > 0 || totKhr > 0)) status = 'unpaid';
  else if (paidUsd < totUsd || paidKhr < totKhr) status = 'partial';
  else status = 'paid';

  const result = db.prepare(`
    INSERT INTO expenses (
      event_id, category, item_name, vendor_name, vendor_phone,
      total_amount_usd, total_amount_khr, paid_amount_usd, paid_amount_khr,
      payment_status, expense_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    b.category || 'catering',
    String(b.item_name).trim(),
    b.vendor_name || '',
    b.vendor_phone || '',
    totUsd,
    totKhr,
    paidUsd,
    paidKhr,
    status,
    b.expense_date || new Date().toISOString().slice(0, 10),
    b.notes || ''
  );

  const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(Number(result.lastInsertRowid));
  logAudit(eventId, 'CREATE_EXPENSE', 'ម្ចាស់កម្មវិធី', `កត់ត្រាចំណាយ៖ ${created.item_name} ($${totUsd})`);
  res.status(201).json(created);
});

apiRouter.put('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកំណត់ត្រាចំណាយ' });

  const b = req.body || {};
  const totUsd = Math.max(0, Number(b.total_amount_usd ?? existing.total_amount_usd) || 0);
  const totKhr = Math.max(0, Number(b.total_amount_khr ?? existing.total_amount_khr) || 0);
  const paidUsd = Math.max(0, Number(b.paid_amount_usd ?? existing.paid_amount_usd) || 0);
  const paidKhr = Math.max(0, Number(b.paid_amount_khr ?? existing.paid_amount_khr) || 0);

  let status = 'paid';
  if (paidUsd === 0 && paidKhr === 0 && (totUsd > 0 || totKhr > 0)) status = 'unpaid';
  else if (paidUsd < totUsd || paidKhr < totKhr) status = 'partial';

  db.prepare(`
    UPDATE expenses SET
      category = ?, item_name = ?, vendor_name = ?, vendor_phone = ?,
      total_amount_usd = ?, total_amount_khr = ?, paid_amount_usd = ?, paid_amount_khr = ?,
      payment_status = ?, expense_date = ?, notes = ?
    WHERE id = ?
  `).run(
    b.category ?? existing.category,
    b.item_name ? String(b.item_name).trim() : existing.item_name,
    b.vendor_name ?? existing.vendor_name,
    b.vendor_phone ?? existing.vendor_phone,
    totUsd,
    totKhr,
    paidUsd,
    paidKhr,
    status,
    b.expense_date ?? existing.expense_date,
    b.notes ?? existing.notes,
    id
  );

  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
});

apiRouter.delete('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ success: true });
});

// 14. Cash Box Denomination Save
apiRouter.put('/events/:eventId/cash-count', (req, res) => {
  const eventId = Number(req.params.eventId);
  const b = req.body || {};
  const jsonStr = JSON.stringify(b.denominations || {});
  const countedBy = b.counted_by || 'គណៈកម្មការរាប់ប្រាក់';
  const notes = b.notes || '';

  db.prepare(`
    INSERT INTO cash_counts (event_id, denominations_json, counted_by, notes, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      denominations_json = excluded.denominations_json,
      counted_by = excluded.counted_by,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(eventId, jsonStr, countedBy, notes);

  logAudit(eventId, 'SAVE_CASH_COUNT', countedBy, 'បានរក្សាទុកការរាប់សាច់ប្រាក់ក្នុងហិបតាមប្រភេទក្រដាសប្រាក់');
  const saved = db.prepare('SELECT * FROM cash_counts WHERE event_id = ?').get(eventId);
  res.json({
    ...saved,
    denominations: JSON.parse(saved.denominations_json || '{}'),
  });
});

// 15. Outgoing Chongdai CRUD (សៀវភៅចងដៃកម្មវិធីគេ)
apiRouter.post('/outgoing-gifts', (req, res) => {
  const b = req.body || {};
  if (!b.recipient_name || !String(b.recipient_name).trim()) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះម្ចាស់កម្មវិធី' });
  }
  const result = db.prepare(`
    INSERT INTO outgoing_gifts (
      recipient_title, recipient_name, recipient_phone, recipient_location,
      relationship, event_type, event_title, event_date,
      amount_usd, amount_khr, exchange_rate, payment_method,
      gift_description, returned_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.recipient_title || 'លោក',
    String(b.recipient_name).trim(),
    b.recipient_phone || '',
    b.recipient_location || '',
    b.relationship || 'friends',
    b.event_type || 'wedding',
    b.event_title || 'ពិធីមង្គលការ',
    b.event_date || new Date().toISOString().slice(0, 10),
    Math.max(0, Number(b.amount_usd) || 0),
    Math.max(0, Number(b.amount_khr) || 0),
    Number(b.exchange_rate) || 4000,
    b.payment_method || 'cash',
    b.gift_description || '',
    b.returned_status || 'pending_return',
    b.notes || ''
  );

  const created = db.prepare('SELECT * FROM outgoing_gifts WHERE id = ?').get(Number(result.lastInsertRowid));
  logAudit(null, 'CREATE_OUTGOING', 'ម្ចាស់គ្រួសារ', `កត់ត្រាចងដៃកម្មវិធីគេ៖ ${created.recipient_title} ${created.recipient_name} ($${created.amount_usd} / ${created.amount_khr}៛)`);
  res.status(201).json(created);
});

apiRouter.put('/outgoing-gifts/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM outgoing_gifts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'រកមិនឃើញកំណត់ត្រា' });

  const b = req.body || {};
  db.prepare(`
    UPDATE outgoing_gifts SET
      recipient_title = ?, recipient_name = ?, recipient_phone = ?, recipient_location = ?,
      relationship = ?, event_type = ?, event_title = ?, event_date = ?,
      amount_usd = ?, amount_khr = ?, exchange_rate = ?, payment_method = ?,
      gift_description = ?, returned_status = ?, notes = ?
    WHERE id = ?
  `).run(
    b.recipient_title ?? existing.recipient_title,
    b.recipient_name ? String(b.recipient_name).trim() : existing.recipient_name,
    b.recipient_phone ?? existing.recipient_phone,
    b.recipient_location ?? existing.recipient_location,
    b.relationship ?? existing.relationship,
    b.event_type ?? existing.event_type,
    b.event_title ?? existing.event_title,
    b.event_date ?? existing.event_date,
    Math.max(0, Number(b.amount_usd ?? existing.amount_usd) || 0),
    Math.max(0, Number(b.amount_khr ?? existing.amount_khr) || 0),
    Number(b.exchange_rate ?? existing.exchange_rate) || 4000,
    b.payment_method ?? existing.payment_method,
    b.gift_description ?? existing.gift_description,
    b.returned_status ?? existing.returned_status,
    b.notes ?? existing.notes,
    id
  );

  res.json(db.prepare('SELECT * FROM outgoing_gifts WHERE id = ?').get(id));
});

apiRouter.delete('/outgoing-gifts/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM outgoing_gifts WHERE id = ?').run(id);
  res.json({ success: true });
});

// 16. QR Code Generator endpoint (real scannable QR data URL)
apiRouter.get('/qrcode', async (req, res) => {
  try {
    const text = String(req.query.text || 'Katchongdai Cambodia');
    const colorDark = String(req.query.dark || '#1e1b4b');
    const dataUrl = await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: { dark: colorDark, light: '#ffffff' },
    });
    res.json({ dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17. Full Database JSON Backup & Restore + Reset Demo / Clear All
apiRouter.get('/system/export-json', (req, res) => {
  const payload = {
    app: 'Katchongdai Pro',
    version: '2.0.0',
    exported_at: new Date().toISOString(),
    events: db.prepare('SELECT * FROM events').all(),
    contributions: db.prepare('SELECT * FROM contributions').all(),
    invitations: db.prepare('SELECT * FROM invitations').all(),
    expenses: db.prepare('SELECT * FROM expenses').all(),
    outgoing_gifts: db.prepare('SELECT * FROM outgoing_gifts').all(),
    cash_counts: db.prepare('SELECT * FROM cash_counts').all(),
  };
  res.json(payload);
});

apiRouter.post('/system/import-json', (req, res) => {
  const data = req.body || {};
  if (!Array.isArray(data.events)) {
    return res.status(400).json({ error: 'ទម្រង់ឯកសារបម្រុងទុកមិនត្រឹមត្រូវទេ' });
  }
  db.exec('BEGIN');
  try {
    clearAllData();
    const insEv = db.prepare(`
      INSERT INTO events (
        id, code, title, event_type, host_names, parent_names, event_date, event_time,
        location_name, province, address, map_link, exchange_rate, target_budget_usd,
        expected_guests, total_tables, seats_per_table, price_per_table_usd,
        khqr_aba_name, khqr_aba_account, khqr_acleda_account, khqr_wing_account,
        greeting_message, status, theme_color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of data.events) {
      insEv.run(
        e.id, e.code, e.title, e.event_type, e.host_names || '', e.parent_names || '',
        e.event_date, e.event_time || '17:00', e.location_name || '', e.province || '',
        e.address || '', e.map_link || '', e.exchange_rate || 4000, e.target_budget_usd || 0,
        e.expected_guests || 200, e.total_tables || 20, e.seats_per_table || 10, e.price_per_table_usd || 150,
        e.khqr_aba_name || '', e.khqr_aba_account || '', e.khqr_acleda_account || '', e.khqr_wing_account || '',
        e.greeting_message || '', e.status || 'active', e.theme_color || 'amber',
        e.created_at || new Date().toISOString(), e.updated_at || new Date().toISOString()
      );
    }

    if (Array.isArray(data.invitations)) {
      const insInv = db.prepare(`
        INSERT INTO invitations (
          id, event_id, invite_code, guest_title, guest_name, guest_phone, guest_location,
          guest_group, side, table_number, seats_reserved, card_delivered, rsvp_status,
          expected_chongdai_note, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const i of data.invitations) {
        insInv.run(
          i.id, i.event_id, i.invite_code, i.guest_title || 'លោក', i.guest_name,
          i.guest_phone || '', i.guest_location || '', i.guest_group || 'friends',
          i.side || 'both', i.table_number || '', i.seats_reserved || 2,
          i.card_delivered ?? 1, i.rsvp_status || 'invited', i.expected_chongdai_note || '',
          i.notes || '', i.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.contributions)) {
      const insC = db.prepare(`
        INSERT INTO contributions (
          id, event_id, receipt_no, envelope_no, guest_title, guest_name, guest_phone,
          guest_location, guest_group, side, amount_usd, amount_khr, payment_method,
          payment_ref, gift_description, gift_estimated_usd, table_number, pax_count,
          blessing_note, recorded_by, verification_status, invitation_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data.contributions) {
        insC.run(
          c.id, c.event_id, c.receipt_no, c.envelope_no || '', c.guest_title || 'លោក',
          c.guest_name, c.guest_phone || '', c.guest_location || '', c.guest_group || 'friends',
          c.side || 'both', c.amount_usd || 0, c.amount_khr || 0, c.payment_method || 'cash',
          c.payment_ref || '', c.gift_description || '', c.gift_estimated_usd || 0,
          c.table_number || '', c.pax_count ?? 1, c.blessing_note || '',
          c.recorded_by || 'អ្នកកត់ត្រា', c.verification_status || 'verified',
          c.invitation_id || null, c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.expenses)) {
      const insEx = db.prepare(`
        INSERT INTO expenses (
          id, event_id, category, item_name, vendor_name, vendor_phone,
          total_amount_usd, total_amount_khr, paid_amount_usd, paid_amount_khr,
          payment_status, expense_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ex of data.expenses) {
        insEx.run(
          ex.id, ex.event_id, ex.category || 'other', ex.item_name,
          ex.vendor_name || '', ex.vendor_phone || '', ex.total_amount_usd || 0,
          ex.total_amount_khr || 0, ex.paid_amount_usd || 0, ex.paid_amount_khr || 0,
          ex.payment_status || 'paid', ex.expense_date || '', ex.notes || '',
          ex.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.outgoing_gifts)) {
      const insOut = db.prepare(`
        INSERT INTO outgoing_gifts (
          id, recipient_title, recipient_name, recipient_phone, recipient_location,
          relationship, event_type, event_title, event_date, amount_usd, amount_khr,
          exchange_rate, payment_method, gift_description, returned_status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const og of data.outgoing_gifts) {
        insOut.run(
          og.id, og.recipient_title || 'លោក', og.recipient_name, og.recipient_phone || '',
          og.recipient_location || '', og.relationship || 'friends', og.event_type || 'wedding',
          og.event_title || '', og.event_date || '', og.amount_usd || 0, og.amount_khr || 0,
          og.exchange_rate || 4000, og.payment_method || 'cash', og.gift_description || '',
          og.returned_status || 'pending_return', og.notes || '', og.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.cash_counts)) {
      const insCc = db.prepare(`
        INSERT INTO cash_counts (id, event_id, denominations_json, counted_by, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const cc of data.cash_counts) {
        insCc.run(cc.id, cc.event_id, cc.denominations_json || '{}', cc.counted_by || '', cc.notes || '', cc.updated_at || new Date().toISOString());
      }
    }

    db.exec('COMMIT');
    logAudit(null, 'RESTORE_BACKUP', 'ម្ចាស់កម្មវិធី', `បានស្ដារទិន្នន័យបម្រុងទុកឡើងវិញ (${data.events.length} កម្មវិធី)`);
    res.json({ success: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/system/reset-demo', (req, res) => {
  seedDemoData();
  res.json({ success: true });
});

apiRouter.post('/system/clear-all', (req, res) => {
  clearAllData();
  logAudit(null, 'CLEAR_ALL', 'ម្ចាស់កម្មវិធី', 'បានសម្អាតទិន្នន័យទាំងអស់ដើម្បីចាប់ផ្តើមថ្មី');
  res.json({ success: true });
});
