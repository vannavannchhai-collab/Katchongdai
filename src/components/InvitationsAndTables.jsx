import React, { useState, useMemo } from 'react';
import {
  Users,
  LayoutGrid,
  Plus,
  Search,
  CheckCircle2,
  Edit3,
  Trash2,
  ArrowRightCircle,
  X,
  Send,
} from 'lucide-react';
import {
  GUEST_TITLES,
  GUEST_GROUPS,
  SIDES,
  RSVP_STATUSES,
  PROVINCES,
  formatUSD,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

const EMPTY_INV = {
  guest_title: 'លោក',
  guest_name: '',
  guest_phone: '',
  guest_location: 'សៀមរាប',
  guest_group: 'friends',
  side: 'both',
  table_number: 'T-01',
  seats_reserved: 2,
  card_delivered: true,
  rsvp_status: 'invited',
  expected_chongdai_note: '',
  notes: '',
};

export default function InvitationsAndTables({
  activeEvent,
  workspace,
  onRecordChongdaiForInvite,
  onRefresh,
  notify,
}) {
  const [subTab, setSubTab] = useState('list'); // 'list' | 'tables'
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [form, setForm] = useState(EMPTY_INV);
  const [saving, setSaving] = useState(false);

  const invitations = workspace?.invitations || [];
  const contributions = workspace?.contributions || [];
  const rate = activeEvent?.exchange_rate || 4000;

  // Build Table Map combining Invitations & Contributions
  const tableCards = useMemo(() => {
    const map = new Map();
    const ensureTable = (tName) => {
      const key = tName || 'មិនទាន់រៀបតុ';
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          invitedSeats: 0,
          invites: [],
          contributions: [],
          totalUsdEquiv: 0,
        });
      }
      return map.get(key);
    };

    // Pre-create VIP-1 and T-01..T-08 or up to activeEvent.total_tables (capped to 16 visual + any occupied)
    const visualCount = Math.min(activeEvent?.total_tables || 10, 12);
    ensureTable('VIP-1');
    for (let i = 1; i <= visualCount; i++) {
      ensureTable(`T-${String(i).padStart(2, '0')}`);
    }

    for (const inv of invitations) {
      const t = ensureTable(inv.table_number || 'មិនទាន់រៀបតុ');
      t.invitedSeats += Number(inv.seats_reserved || 1);
      t.invites.push(inv);
    }

    for (const c of contributions) {
      if (c.table_number) {
        const t = ensureTable(c.table_number);
        t.contributions.push(c);
        t.totalUsdEquiv += Number(c.amount_usd || 0) + Number(c.amount_khr || 0) / rate;
      }
    }

    return Array.from(map.values());
  }, [invitations, contributions, activeEvent, rate]);

  const filteredInvites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter((inv) => {
      if (rsvpFilter !== 'all' && inv.rsvp_status !== rsvpFilter) return false;
      if (!q) return true;
      return (
        inv.guest_name.toLowerCase().includes(q) ||
        (inv.table_number || '').toLowerCase().includes(q) ||
        (inv.guest_location || '').toLowerCase().includes(q)
      );
    });
  }, [invitations, search, rsvpFilter]);

  const openCreate = () => {
    setEditingInv(null);
    setForm(EMPTY_INV);
    setModalOpen(true);
  };

  const openEdit = (inv) => {
    setEditingInv(inv);
    setForm({
      ...inv,
      card_delivered: Boolean(inv.card_delivered),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeEvent) return;
    setSaving(true);
    try {
      if (editingInv) {
        await apiRequest(`/api/invitations/${editingInv.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        notify('បានកែប្រែព័ត៌មានភ្ញៀវអញ្ជើញ!');
      } else {
        await apiRequest(`/api/events/${activeEvent.id}/invitations`, {
          method: 'POST',
          body: JSON.stringify(form),
        });
        notify('បានបន្ថែមឈ្មោះភ្ញៀវអញ្ជើញថ្មី!');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`លុបឈ្មោះភ្ញៀវអញ្ជើញ "${inv.guest_title} ${inv.guest_name}"?`)) return;
    try {
      await apiRequest(`/api/invitations/${inv.id}`, { method: 'DELETE' });
      notify('បានលុបភ្ញៀវអញ្ជើញរួចរាល់');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const toggleCardDelivered = async (inv) => {
    try {
      await apiRequest(`/api/invitations/${inv.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...inv, card_delivered: !inv.card_delivered }),
      });
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (!activeEvent) return null;
  const seatsPerTable = activeEvent.seats_per_table || 10;
  const tablePrice = activeEvent.price_per_table_usd || 150;

  return (
    <div className="space-y-5">
      {/* Header & View Toggle */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            បញ្ជីភ្ញៀវអញ្ជើញ & ការរៀបចំតុភ្ញៀវ • {activeEvent.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            តាមដានការជូនធៀប ការបញ្ជាក់ចូលរួម (RSVP) ផែនទីតុភ្ញៀវ និងចុច ១ដងដើម្បីកត់ចំណងដៃពេលភ្ញៀវមកដល់
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setSubTab('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'list' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> បញ្ជីភ្ញៀវ ({invitations.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('tables')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'tables' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> ផែនទីតុភ្ញៀវ ({tableCards.length})
            </button>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> បន្ថែមភ្ញៀវអញ្ជើញ
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white p-4 border border-slate-200">
          <div className="text-xs text-slate-500">គ្រួសារ/ភ្ញៀវបានអញ្ជើញ</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {invitations.length} <span className="text-xs font-semibold text-slate-500">({activeEvent.stats?.total_seats || 0} កៅអី)</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-200">
          <div className="text-xs text-slate-500">បានជូនធៀបរួចរាល់</div>
          <div className="text-xl font-black text-indigo-700 mt-0.5">
            {activeEvent.stats?.delivered_count || 0} / {invitations.length}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-200">
          <div className="text-xs text-slate-500">បញ្ជាក់ចូលរួម (Confirmed)</div>
          <div className="text-xl font-black text-sky-700 mt-0.5">
            {activeEvent.stats?.confirmed_count || 0} គ្រួសារ
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
          <div className="text-xs text-emerald-800">បានមកដល់ & ចងដៃរួច</div>
          <div className="text-xl font-black text-emerald-900 mt-0.5">
            {activeEvent.stats?.attended_count || 0} គ្រួសារ
          </div>
        </div>
      </div>

      {subTab === 'list' ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ស្វែងរកភ្ញៀវ លេខតុ ខេត្ត..."
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['all', 'invited', 'confirmed', 'attended', 'declined'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRsvpFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    rsvpFilter === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st === 'all' ? 'ទាំងអស់' : RSVP_STATUSES[st]?.km}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600">
                  <th className="py-3 px-4">ឈ្មោះភ្ញៀវអញ្ជើញ</th>
                  <th className="py-3 px-3">មកពី / ក្រុម</th>
                  <th className="py-3 px-3">លេខតុ & កៅអី</th>
                  <th className="py-3 px-3">ជូនធៀប</th>
                  <th className="py-3 px-3">ស្ថានភាពចូលរួម</th>
                  <th className="py-3 px-3">កំណត់សម្គាល់ចំណងដៃ</th>
                  <th className="py-3 px-4 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      មិនមានឈ្មោះភ្ញៀវអញ្ជើញក្នុងបញ្ជីនេះទេ
                    </td>
                  </tr>
                ) : (
                  filteredInvites.map((inv) => {
                    const st = RSVP_STATUSES[inv.rsvp_status] || RSVP_STATUSES.invited;
                    return (
                      <tr key={inv.id} className="hover:bg-amber-50/30">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {inv.guest_title} {inv.guest_name}
                          </div>
                          {inv.guest_phone && (
                            <div className="text-[11px] text-slate-500">{inv.guest_phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-700">{inv.guest_location || '—'}</div>
                          <div className="text-[11px] text-slate-500">
                            {GUEST_GROUPS[inv.guest_group]?.km} • {SIDES[inv.side]?.km}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
                            {inv.table_number || 'មិនទាន់រៀប'}
                          </span>
                          <span className="ml-1.5 text-slate-500">({inv.seats_reserved} កៅអី)</span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => toggleCardDelivered(inv)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              inv.card_delivered
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            {inv.card_delivered ? 'បានជូនធៀប' : 'មិនទាន់ជូន'}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${st.badge}`}>
                            {st.km}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">
                          {inv.expected_chongdai_note || inv.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.rsvp_status !== 'attended' ? (
                              <button
                                type="button"
                                onClick={() => onRecordChongdaiForInvite(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold cursor-pointer"
                              >
                                <ArrowRightCircle className="w-3.5 h-3.5" />
                                កត់ចំណងដៃ
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold mr-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> បានចងដៃ
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(inv)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(inv)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Banquet Table Seating Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tableCards.map((t) => {
            const overCapacity = t.invitedSeats > seatsPerTable;
            const tableProfit = t.totalUsdEquiv - tablePrice;
            return (
              <div
                key={t.name}
                className={`rounded-2xl bg-white border p-4 shadow-xs space-y-3 ${
                  t.name.startsWith('VIP')
                    ? 'border-amber-400 bg-gradient-to-b from-amber-50/50 to-white'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-300 font-black text-xs flex items-center justify-center">
                      {t.name}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">តុលេខ {t.name}</div>
                      <div className={`text-[11px] font-semibold ${overCapacity ? 'text-rose-600' : 'text-slate-500'}`}>
                        កៅអីបម្រុង៖ {t.invitedSeats}/{seatsPerTable} នាក់
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-700 tabular-nums">
                      {formatUSD(t.totalUsdEquiv)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t.totalUsdEquiv > 0
                        ? tableProfit >= 0
                          ? `លើសថ្លៃតុ +${formatUSD(tableProfit)}`
                          : `ថ្លៃតុ $${tablePrice}`
                        : `ថ្លៃតុ $${tablePrice}`}
                    </div>
                  </div>
                </div>

                {/* Seat Visual Dots */}
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: seatsPerTable }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        idx < t.invitedSeats
                          ? 'bg-amber-500 border-amber-600'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Guests Assigned */}
                <div className="space-y-1 pt-2 border-t border-slate-100 min-h-[70px]">
                  {t.invites.length === 0 && t.contributions.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic">តុទំនេរ — មិនទាន់ចាត់ភ្ញៀវ</div>
                  ) : (
                    <>
                      {t.invites.map((g) => (
                        <div key={`i-${g.id}`} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate">
                            {g.guest_title} {g.guest_name} ({g.seats_reserved})
                          </span>
                          <span className={`text-[10px] font-bold ${g.rsvp_status === 'attended' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {g.rsvp_status === 'attended' ? '✓ មកដល់' : 'អញ្ជើញ'}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Invitation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="text-sm font-bold">
                {editingInv ? 'កែប្រែឈ្មោះភ្ញៀវអញ្ជើញ' : 'បន្ថែមឈ្មោះភ្ញៀវក្នុងបញ្ជីធៀបអញ្ជើញ'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ងារ</label>
                  <select
                    value={form.guest_title}
                    onChange={(e) => setForm({ ...form, guest_title: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
                  >
                    {GUEST_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះភ្ញៀវ *</label>
                  <input
                    type="text"
                    required
                    value={form.guest_name}
                    onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                    placeholder="ឧ. លោក មាស តារា"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={form.guest_phone}
                    onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">មកពីខេត្ត/ទីតាំង</label>
                  <input
                    type="text"
                    list="inv-provinces"
                    value={form.guest_location}
                    onChange={(e) => setForm({ ...form, guest_location: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <datalist id="inv-provinces">
                    {PROVINCES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">លេខតុ</label>
                  <input
                    type="text"
                    value={form.table_number}
                    onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                    placeholder="T-01 ឬ VIP-1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ចំនួនកៅអី</label>
                  <input
                    type="number"
                    min="1"
                    value={form.seats_reserved}
                    onChange={(e) => setForm({ ...form, seats_reserved: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ស្ថានភាព RSVP</label>
                  <select
                    value={form.rsvp_status}
                    onChange={(e) => setForm({ ...form, rsvp_status: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs"
                  >
                    {Object.values(RSVP_STATUSES).map((s) => (
                      <option key={s.id} value={s.id}>{s.km}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ក្រុមភ្ញៀវ</label>
                  <select
                    value={form.guest_group}
                    onChange={(e) => setForm({ ...form, guest_group: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {Object.values(GUEST_GROUPS).map((g) => (
                      <option key={g.id} value={g.id}>{g.km}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ភ្ញៀវខាង</label>
                  <select
                    value={form.side}
                    onChange={(e) => setForm({ ...form, side: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {Object.values(SIDES).map((s) => (
                      <option key={s.id} value={s.id}>{s.km}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  កំណត់សម្គាល់ប្រវត្តិចំណងដៃ / ចំណាំ
                </label>
                <input
                  type="text"
                  value={form.expected_chongdai_note}
                  onChange={(e) => setForm({ ...form, expected_chongdai_note: e.target.value })}
                  placeholder="ឧ. យើងធ្លាប់ចងដៃគាត់ $50 កាលឆ្នាំ 2025"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
