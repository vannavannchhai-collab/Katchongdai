import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Upload,
  Printer,
  Receipt,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
} from 'lucide-react';
import {
  GUEST_TITLES,
  PAYMENT_METHODS,
  GUEST_GROUPS,
  SIDES,
  formatUSD,
  formatKHR,
  downloadCSV,
  parseSimpleCSV,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

export default function LedgerBook({
  activeEvent,
  workspace,
  onNavigate,
  onRefresh,
  onViewReceipt,
  onOpenPrintBook,
  notify,
}) {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingRow, setEditingRow] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const contributions = workspace?.contributions || [];
  const rate = activeEvent?.exchange_rate || 4000;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contributions.filter((c) => {
      if (methodFilter !== 'all' && c.payment_method !== methodFilter) return false;
      if (sideFilter !== 'all' && c.side !== sideFilter) return false;
      if (groupFilter !== 'all' && c.guest_group !== groupFilter) return false;
      if (statusFilter !== 'all' && c.verification_status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.guest_name.toLowerCase().includes(q) ||
        String(c.receipt_no).toLowerCase().includes(q) ||
        (c.guest_location || '').toLowerCase().includes(q) ||
        (c.guest_phone || '').toLowerCase().includes(q) ||
        (c.gift_description || '').toLowerCase().includes(q) ||
        (c.blessing_note || '').toLowerCase().includes(q) ||
        (c.table_number || '').toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === 'receipt_asc') {
        return String(a.receipt_no).localeCompare(String(b.receipt_no), undefined, { numeric: true });
      }
      if (sortBy === 'amount_desc') {
        const eqA = Number(a.amount_usd) + Number(a.amount_khr) / rate;
        const eqB = Number(b.amount_usd) + Number(b.amount_khr) / rate;
        return eqB - eqA;
      }
      return b.id - a.id;
    });
  }, [contributions, search, methodFilter, sideFilter, groupFilter, statusFilter, sortBy, rate]);

  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, c) => {
        acc.usd += Number(c.amount_usd || 0);
        acc.khr += Number(c.amount_khr || 0);
        return acc;
      },
      { usd: 0, khr: 0 }
    );
  }, [filtered]);

  const handleExportCSV = () => {
    if (!activeEvent) return;
    const headers = [
      'លេខរៀង',
      'ងារ',
      'ឈ្មោះភ្ញៀវ',
      'លេខទូរស័ព្ទ',
      'មកពី',
      'ក្រុមភ្ញៀវ',
      'ខាង',
      'ប្រាក់ដុល្លារ',
      'ប្រាក់រៀល',
      'វិធីបង់ប្រាក់',
      'លេខតុ',
      'វត្ថុអនុស្សាវរីយ៍',
      'ចំណាំ',
      'អ្នកកត់ត្រា',
      'កាលបរិច្ឆេទ',
    ];
    const rows = filtered.map((c) => [
      c.receipt_no,
      c.guest_title,
      c.guest_name,
      c.guest_phone,
      c.guest_location,
      GUEST_GROUPS[c.guest_group]?.km || c.guest_group,
      SIDES[c.side]?.km || c.side,
      c.amount_usd,
      c.amount_khr,
      PAYMENT_METHODS[c.payment_method]?.km || c.payment_method,
      c.table_number,
      c.gift_description,
      c.blessing_note,
      c.recorded_by,
      c.created_at,
    ]);
    downloadCSV(`Katchongdai_${activeEvent.code}.csv`, headers, rows);
    notify('បានទាញយកឯកសារ Excel CSV ដោយជោគជ័យ!');
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeEvent) return;
    try {
      const text = await file.text();
      const rows = parseSimpleCSV(text);
      if (rows.length === 0) {
        notify('មិនមានទិន្នន័យត្រឹមត្រូវក្នុងឯកសារ CSV ទេ', 'error');
        return;
      }
      const res = await apiRequest(`/api/events/${activeEvent.id}/contributions/import`, {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      notify(`បាននាំចូលចំណងដៃចំនួន ${res.imported} កំណត់ត្រាដោយជោគជ័យ!`);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleVerifyOnline = async (c) => {
    try {
      await apiRequest(`/api/contributions/${c.id}/verify`, { method: 'PATCH' });
      notify(`បានផ្ទៀងផ្ទាត់ចំណងដៃអនឡាញរបស់ ${c.guest_name} រួចរាល់!`);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`លុបកំណត់ត្រាចំណងដៃ #${c.receipt_no} របស់ "${c.guest_title} ${c.guest_name}"?`)) {
      return;
    }
    try {
      await apiRequest(`/api/contributions/${c.id}`, { method: 'DELETE' });
      notify('បានលុបកំណត់ត្រាចំណងដៃរួចរាល់');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRow) return;
    setSavingEdit(true);
    try {
      await apiRequest(`/api/contributions/${editingRow.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingRow),
      });
      notify('បានកែប្រែកំណត់ត្រាដោយជោគជ័យ!');
      setEditingRow(null);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center border border-slate-200">
        សូមជ្រើសរើសកម្មវិធីជាមុនសិន។
      </div>
    );
  }

  const combinedFilteredUsd = filteredTotals.usd + filteredTotals.khr / rate;

  return (
    <div className="space-y-5">
      {/* Header & Export/Print Toolbar */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            សៀវភៅបញ្ជីចំណងដៃពេញលេញ • {activeEvent.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ស្វែងរក ច្រោះទិន្នន័យ ផ្ទៀងផ្ទាត់ KHQR នាំចេញ Excel (CSV) និងបោះពុម្ពសៀវភៅចំណងដៃផ្លូវការ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('desk')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            បន្ថែមចំណងដៃ
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            នាំចូល CSV
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            ទាញយក Excel CSV
          </button>

          <button
            type="button"
            onClick={onOpenPrintBook}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            បោះពុម្ពសៀវភៅផ្លូវការ
          </button>
        </div>
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ស្វែងរកឈ្មោះ លេខរៀង ខេត្ត តុ វត្ថុ..."
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">គ្រប់វិធីបង់ប្រាក់ទាំងអស់</option>
            {Object.values(PAYMENT_METHODS).map((m) => (
              <option key={m.id} value={m.id}>{m.km}</option>
            ))}
          </select>

          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">គ្រប់ខាងទាំងអស់</option>
            {Object.values(SIDES).map((s) => (
              <option key={s.id} value={s.id}>{s.km}</option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">គ្រប់ក្រុមភ្ញៀវ</option>
            {Object.values(GUEST_GROUPS).map((g) => (
              <option key={g.id} value={g.id}>{g.km}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="newest">តម្រៀប៖ ថ្មីបំផុតមុន</option>
            <option value="receipt_asc">តម្រៀប៖ លេខរៀង 0001 → 9999</option>
            <option value="amount_desc">តម្រៀប៖ ទឹកប្រាក់ច្រើនបំផុត</option>
          </select>
        </div>

        {/* Dynamic Filtered Subtotals Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">បង្ហាញលទ្ធផល៖</span>
            <span className="font-extrabold text-slate-900">{filtered.length} កំណត់ត្រា</span>
            <button
              type="button"
              onClick={() =>
                setStatusFilter(statusFilter === 'pending_online' ? 'all' : 'pending_online')
              }
              className={`px-2.5 py-0.5 rounded-full font-bold border transition cursor-pointer ${
                statusFilter === 'pending_online'
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              រង់ចាំផ្ទៀងផ្ទាត់អនឡាញ ({contributions.filter((c) => c.verification_status === 'pending_online').length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>
              សរុបដុល្លារ៖ <strong className="text-emerald-700 tabular-nums">{formatUSD(filteredTotals.usd)}</strong>
            </span>
            <span>
              សរុបរៀល៖ <strong className="text-sky-700 tabular-nums">{formatKHR(filteredTotals.khr)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-black tabular-nums">
              សមមូលសរុប ≈ {formatUSD(combinedFilteredUsd)}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Data Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase">
                <th className="py-3 px-4">ល.រ</th>
                <th className="py-3 px-4">ឈ្មោះភ្ញៀវកិត្តិយស</th>
                <th className="py-3 px-3">មកពី / ក្រុម</th>
                <th className="py-3 px-3">ខាង / តុ</th>
                <th className="py-3 px-4 text-right">ប្រាក់ដុល្លារ ($)</th>
                <th className="py-3 px-4 text-right">ប្រាក់រៀល (៛)</th>
                <th className="py-3 px-3">វិធីបង់ប្រាក់</th>
                <th className="py-3 px-3">ស្ថានភាព</th>
                <th className="py-3 px-4 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    មិនមានកំណត់ត្រាចំណងដៃត្រូវនឹងការស្វែងរកនេះទេ
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const pm = PAYMENT_METHODS[c.payment_method] || PAYMENT_METHODS.cash;
                  const side = SIDES[c.side] || SIDES.both;
                  return (
                    <tr key={c.id} className="hover:bg-amber-50/35 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        #{c.receipt_no}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {c.guest_title} {c.guest_name}
                        </div>
                        {(c.gift_description || c.blessing_note) && (
                          <div className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                            {c.gift_description ? `🎁 ${c.gift_description} ` : ''}
                            {c.blessing_note ? `• “${c.blessing_note}”` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{c.guest_location || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {GUEST_GROUPS[c.guest_group]?.km || c.guest_group}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${side.badge}`}>
                          {side.km}
                        </span>
                        {c.table_number && (
                          <div className="text-[11px] font-bold text-indigo-700 mt-0.5">
                            តុ៖ {c.table_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums text-emerald-700 text-sm">
                        {Number(c.amount_usd) > 0 ? formatUSD(c.amount_usd) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums text-sky-700 text-sm">
                        {Number(c.amount_khr) > 0 ? formatKHR(c.amount_khr) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-bold ${pm.badge}`}>
                          {pm.short}
                        </span>
                        {c.payment_ref && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {c.payment_ref}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {c.verification_status === 'pending_online' ? (
                          <button
                            type="button"
                            onClick={() => handleVerifyOnline(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            អនុម័ត KHQR
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> បានផ្ទៀងផ្ទាត់
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                          {c.recorded_by}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(c, activeEvent)}
                            title="បង្កាន់ដៃថ្លែងអំណរគុណ"
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-600 hover:text-amber-900 cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRow({ ...c })}
                            title="កែប្រែ"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            title="លុប"
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

      {/* Edit Contribution Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="text-sm font-bold">
                កែប្រែកំណត់ត្រាចំណងដៃ #{editingRow.receipt_no}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ងារ</label>
                  <select
                    value={editingRow.guest_title}
                    onChange={(e) => setEditingRow({ ...editingRow, guest_title: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
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
                    value={editingRow.guest_name}
                    onChange={(e) => setEditingRow({ ...editingRow, guest_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">ប្រាក់ដុល្លារ ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingRow.amount_usd}
                    onChange={(e) => setEditingRow({ ...editingRow, amount_usd: e.target.value })}
                    className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">ប្រាក់រៀល (៛)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editingRow.amount_khr}
                    onChange={(e) => setEditingRow({ ...editingRow, amount_khr: e.target.value })}
                    className="w-full rounded-xl border border-sky-300 px-3 py-2 text-sm font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">វិធីបង់ប្រាក់</label>
                  <select
                    value={editingRow.payment_method}
                    onChange={(e) => setEditingRow({ ...editingRow, payment_method: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {Object.values(PAYMENT_METHODS).map((m) => (
                      <option key={m.id} value={m.id}>{m.short}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ខាង</label>
                  <select
                    value={editingRow.side}
                    onChange={(e) => setEditingRow({ ...editingRow, side: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {Object.values(SIDES).map((s) => (
                      <option key={s.id} value={s.id}>{s.km}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">លេខតុ</label>
                  <input
                    type="text"
                    value={editingRow.table_number}
                    onChange={(e) => setEditingRow({ ...editingRow, table_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">មកពី</label>
                  <input
                    type="text"
                    value={editingRow.guest_location}
                    onChange={(e) => setEditingRow({ ...editingRow, guest_location: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">វត្ថុអនុស្សាវរីយ៍</label>
                  <input
                    type="text"
                    value={editingRow.gift_description}
                    onChange={(e) => setEditingRow({ ...editingRow, gift_description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ពាក្យជូនពរ / ចំណាំ</label>
                <input
                  type="text"
                  value={editingRow.blessing_note}
                  onChange={(e) => setEditingRow({ ...editingRow, blessing_note: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  {savingEdit ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
