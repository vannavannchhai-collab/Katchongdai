import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Receipt,
  RotateCcw,
  UserCheck,
  Gift,
  HeartHandshake,
  Zap,
  Search,
  MapPin,
} from 'lucide-react';
import {
  EVENT_TYPES,
  GUEST_TITLES,
  PAYMENT_METHODS,
  GUEST_GROUPS,
  SIDES,
  QUICK_USD_AMOUNTS,
  QUICK_KHR_AMOUNTS,
  CLERK_DESKS,
  PROVINCES,
  formatUSD,
  formatKHR,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

export default function ReceptionDesk({
  activeEvent,
  workspace,
  reciprocityDirectory,
  prefillGuest,
  onClearPrefill,
  onRefresh,
  onViewReceipt,
  notify,
}) {
  const nameInputRef = useRef(null);
  const [clerkName, setClerkName] = useState(CLERK_DESKS[0]);
  const [autoOpenReceipt, setAutoOpenReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deskSearch, setDeskSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    receipt_no: '',
    envelope_no: '',
    guest_title: 'លោក',
    guest_name: '',
    guest_phone: '',
    guest_location: '',
    guest_group: 'friends',
    side: 'both',
    amount_usd: '',
    amount_khr: '',
    payment_method: 'cash',
    payment_ref: '',
    gift_description: '',
    gift_estimated_usd: '',
    table_number: '',
    pax_count: 1,
    blessing_note: '',
    invitation_id: null,
  });

  const contributions = workspace?.contributions || [];
  const invitations = workspace?.invitations || [];
  const evType = activeEvent ? EVENT_TYPES[activeEvent.event_type] || EVENT_TYPES.wedding : EVENT_TYPES.wedding;
  const rate = activeEvent?.exchange_rate || 4000;

  // Next receipt preview
  const nextReceiptPreview = useMemo(() => {
    let maxNum = 0;
    for (const c of contributions) {
      const n = parseInt(String(c.receipt_no).replace(/\D/g, ''), 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
    return String(maxNum + 1).padStart(4, '0');
  }, [contributions]);

  // Apply prefill from Invitations "ភ្ញៀវមកដល់ -> កត់ចំណងដៃ"
  useEffect(() => {
    if (prefillGuest) {
      setForm((prev) => ({
        ...prev,
        guest_title: prefillGuest.guest_title || 'លោក',
        guest_name: prefillGuest.guest_name || '',
        guest_phone: prefillGuest.guest_phone || '',
        guest_location: prefillGuest.guest_location || '',
        guest_group: prefillGuest.guest_group || 'friends',
        side: prefillGuest.side || 'both',
        table_number: prefillGuest.table_number || '',
        pax_count: prefillGuest.seats_reserved || 1,
        invitation_id: prefillGuest.id || null,
      }));
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillGuest, onClearPrefill]);

  // Smart autocomplete combining event invitations + global reciprocity directory
  const suggestions = useMemo(() => {
    const q = form.guest_name.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    const seen = new Set();

    for (const inv of invitations) {
      if (inv.guest_name.toLowerCase().includes(q)) {
        const key = inv.guest_name.trim().toLowerCase();
        seen.add(key);
        const recMatch = (reciprocityDirectory || []).find((r) => r.key === key);
        results.push({
          source: 'invitation',
          invitation_id: inv.id,
          guest_title: inv.guest_title,
          guest_name: inv.guest_name,
          guest_phone: inv.guest_phone,
          guest_location: inv.guest_location,
          guest_group: inv.guest_group,
          side: inv.side,
          table_number: inv.table_number,
          seats_reserved: inv.seats_reserved,
          rsvp_status: inv.rsvp_status,
          reciprocity: recMatch || null,
        });
      }
    }

    for (const rec of reciprocityDirectory || []) {
      if (!seen.has(rec.key) && rec.display_name.toLowerCase().includes(q)) {
        results.push({
          source: 'history',
          invitation_id: null,
          guest_title: rec.display_title,
          guest_name: rec.display_name,
          guest_phone: rec.phone,
          guest_location: rec.location,
          guest_group: rec.group,
          side: 'both',
          table_number: '',
          seats_reserved: 1,
          reciprocity: rec,
        });
      }
    }

    return results.slice(0, 6);
  }, [form.guest_name, invitations, reciprocityDirectory]);

  // Exact match reciprocity insight for currently typed guest
  const matchedInsight = useMemo(() => {
    const key = form.guest_name.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key) return null;
    const inv = invitations.find((i) => i.guest_name.trim().toLowerCase() === key);
    const rec = (reciprocityDirectory || []).find((r) => r.key === key);
    if (!inv && !rec) return null;
    return { inv, rec };
  }, [form.guest_name, invitations, reciprocityDirectory]);

  const applySuggestion = (s) => {
    setForm((prev) => ({
      ...prev,
      guest_title: s.guest_title || prev.guest_title,
      guest_name: s.guest_name,
      guest_phone: s.guest_phone || prev.guest_phone,
      guest_location: s.guest_location || prev.guest_location,
      guest_group: s.guest_group || prev.guest_group,
      side: s.side || prev.side,
      table_number: s.table_number || prev.table_number,
      pax_count: s.seats_reserved || prev.pax_count,
      invitation_id: s.invitation_id || null,
    }));
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setForm({
      receipt_no: '',
      envelope_no: '',
      guest_title: 'លោក',
      guest_name: '',
      guest_phone: '',
      guest_location: '',
      guest_group: 'friends',
      side: evType.hasGroomBrideSides ? form.side : 'both',
      amount_usd: '',
      amount_khr: '',
      payment_method: 'cash',
      payment_ref: '',
      gift_description: '',
      gift_estimated_usd: '',
      table_number: '',
      pax_count: 1,
      blessing_note: '',
      invitation_id: null,
    });
    setTimeout(() => nameInputRef.current?.focus(), 40);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEvent) return;
    if (!form.guest_name.trim()) {
      notify('សូមបញ្ចូលឈ្មោះភ្ញៀវជាមុនសិន!', 'error');
      nameInputRef.current?.focus();
      return;
    }

    const usd = Number(form.amount_usd) || 0;
    const khr = Number(form.amount_khr) || 0;
    if (usd <= 0 && khr <= 0 && !form.gift_description.trim()) {
      notify('សូមបញ្ចូលចំនួនទឹកប្រាក់ចំណងដៃ ($ ឬ ៛) ឬបរិយាយវត្ថុអនុស្សាវរីយ៍!', 'error');
      return;
    }

    setSaving(true);
    try {
      const created = await apiRequest(`/api/events/${activeEvent.id}/contributions`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount_usd: usd,
          amount_khr: khr,
          gift_estimated_usd: Number(form.gift_estimated_usd) || 0,
          recorded_by: clerkName,
        }),
      });

      notify(
        `បានកត់ត្រា #${created.receipt_no} • ${created.guest_title} ${created.guest_name} រួចរាល់!`
      );
      await onRefresh();
      resetForm();

      if (autoOpenReceipt) {
        onViewReceipt(created, activeEvent);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center border border-slate-200">
        សូមជ្រើសរើស ឬបង្កើតកម្មវិធីជាមុនសិន ដើម្បីបើកតុទទួលភ្ញៀវកត់ត្រាចំណងដៃ។
      </div>
    );
  }

  const liveUsdEquiv =
    (Number(form.amount_usd) || 0) + (Number(form.amount_khr) || 0) / rate;

  const filteredRecent = contributions.filter((c) => {
    if (!deskSearch.trim()) return true;
    const q = deskSearch.toLowerCase();
    return (
      c.guest_name.toLowerCase().includes(q) ||
      String(c.receipt_no).includes(q) ||
      (c.guest_location || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Active Ceremony Bar & Clerk Desk Switcher */}
      <div className="rounded-2xl bg-slate-900 text-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
            {evType.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>មុខងារតុទទួលភ្ញៀវកត់ត្រារហ័ស (Fast Reception Desk)</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">{activeEvent.title}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">អ្នកកត់ត្រា៖</span>
            <select
              value={clerkName}
              onChange={(e) => setClerkName(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
            >
              {CLERK_DESKS.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-200 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoOpenReceipt}
              onChange={(e) => setAutoOpenReceipt(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span>បើកបង្កាន់ដៃភ្លាមក្រោយរក្សាទុក</span>
          </label>
        </div>
      </div>

      {/* Main Split Screen: Left Entry Form (7 cols) + Right Live Feed (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT: Fast Chongdai Entry Console */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-7 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-black">
                ល.រ #{form.receipt_no || nextReceiptPreview}
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                បញ្ចូលចំណងដៃភ្ញៀវថ្មី
              </span>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> សម្អាតទម្រង់
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* 1. Honorific Title Quick Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                ១. គោរមងារភ្ញៀវ (ចុចជ្រើសរើសរហ័ស)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GUEST_TITLES.slice(0, 11).map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setForm({ ...form, guest_title: title })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      form.guest_title === title
                        ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Guest Name with Smart Autocomplete + Envelope/Table */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-7 relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ២. ឈ្មោះភ្ញៀវកិត្តិយស *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-xs font-bold text-slate-700">
                    {form.guest_title}
                  </span>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={form.guest_name}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                    onChange={(e) => {
                      setForm({ ...form, guest_name: e.target.value, invitation_id: null });
                      setShowSuggestions(true);
                    }}
                    placeholder="វាយឈ្មោះភ្ញៀវ (ឧ. សុខ ពិសិដ្ឋ)..."
                    className="w-full rounded-r-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Smart Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-white border border-amber-300 shadow-xl overflow-hidden divide-y divide-slate-100">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => applySuggestion(s)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {s.guest_title} {s.guest_name}
                            {s.guest_location && (
                              <span className="font-normal text-slate-500"> • {s.guest_location}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {s.source === 'invitation'
                              ? `ក្នុងបញ្ជីធៀបអញ្ជើញ ${s.table_number ? `• តុ ${s.table_number}` : ''}`
                              : 'ក្នុងប្រវត្តិចំណងដៃពីមុន'}
                          </div>
                        </div>
                        {s.reciprocity && s.reciprocity.outgoing_total_usd_equiv > 0 && (
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            យើងធ្លាប់ចងគាត់ ${s.reciprocity.outgoing_total_usd_equiv}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  មកពី (ខេត្ត/ភូមិ/ស្ថាប័ន)
                </label>
                <input
                  type="text"
                  list="province-options"
                  value={form.guest_location}
                  onChange={(e) => setForm({ ...form, guest_location: e.target.value })}
                  placeholder="ឧ. សៀមរាប"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                />
                <datalist id="province-options">
                  {PROVINCES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខតុ
                </label>
                <input
                  type="text"
                  value={form.table_number}
                  onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                  placeholder="T-01"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Smart Reciprocity & Invitation Insight Alert */}
            {matchedInsight && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs space-y-1">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-amber-600" />
                  <span>ព័ត៌មានឆ្លាតវៃអំពីភ្ញៀវនេះ៖</span>
                </div>
                {matchedInsight.inv && (
                  <div className="text-slate-700">
                    • មានឈ្មោះក្នុងបញ្ជីអញ្ជើញ៖ <strong>តុលេខ {matchedInsight.inv.table_number || 'មិនទាន់កំណត់'}</strong> ({matchedInsight.inv.seats_reserved} កៅអី)
                    {matchedInsight.inv.expected_chongdai_note && ` — ${matchedInsight.inv.expected_chongdai_note}`}
                  </div>
                )}
                {matchedInsight.rec && matchedInsight.rec.outgoing_total_usd_equiv > 0 && (
                  <div className="text-rose-800 font-semibold">
                    • យើងធ្លាប់ចងដៃកម្មវិធីគាត់សរុប៖ <strong>{formatUSD(matchedInsight.rec.outgoing_total_usd_equiv)}</strong>
                  </div>
                )}
                {matchedInsight.rec && matchedInsight.rec.incoming_total_usd_equiv > 0 && (
                  <div className="text-emerald-800 font-semibold">
                    • គាត់ធ្លាប់ចងដៃកម្មវិធីយើងពីមុនសរុប៖ <strong>{formatUSD(matchedInsight.rec.incoming_total_usd_equiv)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* 3. Dual-Currency Amount Inputs (USD $ + KHR ៛) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* USD Box */}
              <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-emerald-950">
                    ៣. ចំណងដៃប្រាក់ដុល្លារ (USD $)
                  </label>
                  {form.amount_usd && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, amount_usd: '' })}
                      className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                    >
                      សម្អាត $
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-700">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.amount_usd}
                    onChange={(e) => setForm({ ...form, amount_usd: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-white border-2 border-emerald-300 pl-9 pr-4 py-2.5 text-xl font-black text-emerald-950 tabular-nums focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_USD_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setForm({ ...form, amount_usd: String(amt) })}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border tabular-nums transition cursor-pointer ${
                        Number(form.amount_usd) === amt
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* KHR Box */}
              <div className="rounded-2xl bg-sky-50/70 border border-sky-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-sky-950">
                    ៤. ចំណងដៃប្រាក់រៀល (KHR ៛)
                  </label>
                  {form.amount_khr && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, amount_khr: '' })}
                      className="text-[11px] text-sky-700 hover:underline cursor-pointer"
                    >
                      សម្អាត ៛
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.amount_khr}
                    onChange={(e) => setForm({ ...form, amount_khr: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl bg-white border-2 border-sky-300 pl-4 pr-9 py-2.5 text-xl font-black text-sky-950 tabular-nums focus:border-sky-600 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-sky-700">
                    ៛
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_KHR_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setForm({ ...form, amount_khr: String(amt) })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border tabular-nums transition cursor-pointer ${
                        Number(form.amount_khr) === amt
                          ? 'bg-sky-700 text-white border-sky-700'
                          : 'bg-white text-sky-900 border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      {(amt / 1000).toFixed(0)}ពាន់៛
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Payment Method, Side & Guest Group */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  វិធីផ្តល់ចំណងដៃ
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  {Object.values(PAYMENT_METHODS).map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.km}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ក្រុមភ្ញៀវ
                </label>
                <select
                  value={form.guest_group}
                  onChange={(e) => setForm({ ...form, guest_group: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  {Object.values(GUEST_GROUPS).map((g) => (
                    <option key={g.id} value={g.id}>{g.km}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ភ្ញៀវខាង
                </label>
                <select
                  value={form.side}
                  onChange={(e) => setForm({ ...form, side: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  {Object.values(SIDES).map((s) => (
                    <option key={s.id} value={s.id}>{s.km}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditional Bank Reference or Physical Gift / Gold Inputs */}
            {(form.payment_method !== 'cash' || form.gift_description) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-amber-50/60 border border-amber-200 p-3.5">
                {form.payment_method !== 'cash' && form.payment_method !== 'gift_item' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      លេខយោងប្រតិបត្តិការធនាគារ (Transaction Ref)
                    </label>
                    <input
                      type="text"
                      value={form.payment_ref}
                      onChange={(e) => setForm({ ...form, payment_ref: e.target.value })}
                      placeholder="ឧ. ABA-9982450"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
                {form.payment_method === 'gift_item' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        <Gift className="w-3.5 h-3.5 inline mr-1" />
                        បរិយាយវត្ថុអនុស្សាវរីយ៍ / មាសប្រាក់
                      </label>
                      <input
                        type="text"
                        value={form.gift_description}
                        onChange={(e) => setForm({ ...form, gift_description: e.target.value })}
                        placeholder="ឧ. ខ្សែកមាស ១ជី ឬ ទូទឹកកក ១គ្រឿង"
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        តម្លៃប៉ាន់ស្មានវត្ថុគិតជា ($) (ស្រេចចិត្ត)
                      </label>
                      <input
                        type="number"
                        value={form.gift_estimated_usd}
                        onChange={(e) => setForm({ ...form, gift_estimated_usd: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Blessing / Phone / Envelope Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  លេខទូរស័ព្ទភ្ញៀវ
                </label>
                <input
                  type="text"
                  value={form.guest_phone}
                  onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                  placeholder="012 xxx xxx"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ពាក្យជូនពរ / កំណត់សម្គាល់បន្ថែម
                </label>
                <input
                  type="text"
                  value={form.blessing_note}
                  onChange={(e) => setForm({ ...form, blessing_note: e.target.value })}
                  placeholder="ឧ. សូមជូនពរសុភមង្គល និងរកទទួលទានមានបាន..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Bar with Live Equivalent Calculation */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                សមមូលសរុបកំពុងបញ្ចូល៖{' '}
                <strong className="text-base text-amber-800 tabular-nums">
                  {formatUSD(liveUsdEquiv)}
                </strong>{' '}
                <span className="text-slate-400">
                  (≈ {formatKHR(liveUsdEquiv * rate)})
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'កំពុងកត់ត្រា...' : 'រក្សាទុកចំណងដៃ (Enter)'}
              </button>
            </div>
          </div>
        </form>

        {/* RIGHT: Live Desk Session Summary & Latest Entries */}
        <div className="xl:col-span-5 space-y-4">
          {/* Desk Instant Counter Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">ភ្ញៀវបានកត់ត្រា</div>
              <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
                {contributions.length}
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 shadow-xs">
              <div className="text-[11px] font-semibold text-emerald-800">សរុបដុល្លារ ($)</div>
              <div className="text-lg font-black text-emerald-950 tabular-nums mt-0.5">
                {formatUSD(activeEvent.stats?.sum_usd)}
              </div>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4 border border-sky-200 shadow-xs">
              <div className="text-[11px] font-semibold text-sky-800">សរុបរៀល (៛)</div>
              <div className="text-base font-black text-sky-950 tabular-nums mt-0.5">
                {formatKHR(activeEvent.stats?.sum_khr)}
              </div>
            </div>
          </div>

          {/* Recent Desk Entries List */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">
                បញ្ជីទើបកត់ត្រាចុងក្រោយ ({filteredRecent.length})
              </div>
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deskSearch}
                  onChange={(e) => setDeskSearch(e.target.value)}
                  placeholder="ស្វែងរកភ្លាមៗ..."
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[510px] overflow-y-auto">
              {filteredRecent.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  មិនទាន់មានកំណត់ត្រាចំណងដៃក្នុងកម្មវិធីនេះទេ
                </div>
              ) : (
                filteredRecent.slice(0, 20).map((c) => {
                  const pm = PAYMENT_METHODS[c.payment_method] || PAYMENT_METHODS.cash;
                  return (
                    <div
                      key={c.id}
                      className="px-4 py-3 hover:bg-amber-50/40 flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            #{c.receipt_no}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {c.guest_title} {c.guest_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {c.guest_location && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {c.guest_location}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold ${pm.badge}`}>
                            {pm.short}
                          </span>
                          {c.table_number && (
                            <span className="text-indigo-700 font-semibold">តុ {c.table_number}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          {Number(c.amount_usd) > 0 && (
                            <div className="text-xs font-black text-emerald-700 tabular-nums">
                              {formatUSD(c.amount_usd)}
                            </div>
                          )}
                          {Number(c.amount_khr) > 0 && (
                            <div className="text-[11px] font-bold text-sky-700 tabular-nums">
                              {formatKHR(c.amount_khr)}
                            </div>
                          )}
                          {c.gift_description && (
                            <div className="text-[10px] text-amber-800 font-semibold max-w-[110px] truncate">
                              🎁 {c.gift_description}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onViewReceipt(c, activeEvent)}
                          title="បោះពុម្ពបង្កាន់ដៃ"
                          className="p-2 rounded-lg bg-slate-50 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
