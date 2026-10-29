import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  formatUSD,
  formatKHR,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

const EMPTY_EXPENSE = {
  category: 'catering',
  item_name: '',
  vendor_name: '',
  vendor_phone: '',
  total_amount_usd: '',
  total_amount_khr: '',
  paid_amount_usd: '',
  paid_amount_khr: '',
  expense_date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function ExpensesTracker({
  activeEvent,
  workspace,
  onRefresh,
  notify,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  const expenses = workspace?.expenses || [];
  const rate = activeEvent?.exchange_rate || 4000;

  const summary = useMemo(() => {
    let totalUsd = 0;
    let paidUsd = 0;
    const byCat = {};

    for (const ex of expenses) {
      const tEq = Number(ex.total_amount_usd || 0) + Number(ex.total_amount_khr || 0) / rate;
      const pEq = Number(ex.paid_amount_usd || 0) + Number(ex.paid_amount_khr || 0) / rate;
      totalUsd += tEq;
      paidUsd += pEq;
      byCat[ex.category] = (byCat[ex.category] || 0) + tEq;
    }

    const incomeUsd = activeEvent?.stats?.combined_usd || 0;
    return {
      totalUsd,
      paidUsd,
      unpaidUsd: Math.max(0, totalUsd - paidUsd),
      incomeUsd,
      netUsd: incomeUsd - totalUsd,
      byCat,
    };
  }, [expenses, rate, activeEvent]);

  const openCreate = () => {
    setEditingExp(null);
    setForm(EMPTY_EXPENSE);
    setModalOpen(true);
  };

  const openEdit = (ex) => {
    setEditingExp(ex);
    setForm({ ...ex });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeEvent) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_amount_usd: Number(form.total_amount_usd) || 0,
        total_amount_khr: Number(form.total_amount_khr) || 0,
        paid_amount_usd:
          form.paid_amount_usd === ''
            ? Number(form.total_amount_usd) || 0
            : Number(form.paid_amount_usd) || 0,
        paid_amount_khr:
          form.paid_amount_khr === ''
            ? Number(form.total_amount_khr) || 0
            : Number(form.paid_amount_khr) || 0,
      };

      if (editingExp) {
        await apiRequest(`/api/expenses/${editingExp.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify('បានកែប្រែកំណត់ត្រាចំណាយ!');
      } else {
        await apiRequest(`/api/events/${activeEvent.id}/expenses`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('បានកត់ត្រាចំណាយថ្មីរួចរាល់!');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ex) => {
    if (!window.confirm(`លុបចំណាយ "${ex.item_name}"?`)) return;
    try {
      await apiRequest(`/api/expenses/${ex.id}`, { method: 'DELETE' });
      notify('បានលុបកំណត់ត្រាចំណាយ');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (!activeEvent) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            គ្រប់គ្រងចំណាយ & គណនេយ្យកម្មវិធី • {activeEvent.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            តាមដានថ្លៃចុងភៅ សម្អាងការ រោងការ ភេសជ្ជៈ ប្រាក់កក់មុន ប្រាក់នៅខ្វះ និងគណនាចំណូល-ចំណាយសុទ្ធ
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> កត់ត្រាចំណាយថ្មី
        </button>
      </div>

      {/* Profit / Loss Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
          <div className="text-xs font-bold text-emerald-800">ចំណូលចំណងដៃសរុបរួម</div>
          <div className="text-2xl font-black text-emerald-950 tabular-nums mt-1">
            {formatUSD(summary.incomeUsd)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            ≈ {formatKHR(summary.incomeUsd * rate)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200">
          <div className="text-xs font-bold text-slate-600">ចំណាយសរុបទាំងអស់</div>
          <div className="text-2xl font-black text-slate-900 tabular-nums mt-1">
            {formatUSD(summary.totalUsd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ចំនួន {expenses.length} ខ្ទង់ចំណាយ
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-5 border border-amber-200">
          <div className="text-xs font-bold text-amber-900">ប្រាក់នៅខ្វះអ្នកផ្គត់ផ្គង់ (Unpaid)</div>
          <div className="text-2xl font-black text-amber-950 tabular-nums mt-1">
            {formatUSD(summary.unpaidUsd)}
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            បានបង់រួច៖ {formatUSD(summary.paidUsd)}
          </div>
        </div>

        <div
          className={`rounded-2xl p-5 border ${
            summary.netUsd >= 0
              ? 'bg-emerald-900 text-white border-emerald-800'
              : 'bg-rose-950 text-white border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold opacity-90">
            <span>សមតុល្យចំណូល-ចំណាយសុទ្ធ</span>
            {summary.netUsd >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-300" />
            )}
          </div>
          <div className="text-2xl font-black tabular-nums mt-1">
            {summary.netUsd >= 0 ? '+' : ''}
            {formatUSD(summary.netUsd)}
          </div>
          <div className="text-[11px] opacity-80 mt-1">
            {summary.netUsd >= 0 ? 'សល់ប្រាក់ចំណេញក្រោយទូទាត់ចំណាយ' : 'ចំណាយលើសចំណងដៃបច្ចុប្បន្ន'}
          </div>
        </div>
      </div>

      {/* Category Progress Breakdown */}
      {expenses.length > 0 && (
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">ភាគរយចំណាយតាមផ្នែកនីមួយៗ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(summary.byCat)
              .sort((a, b) => b[1] - a[1])
              .map(([catId, val]) => {
                const cat = EXPENSE_CATEGORIES[catId] || EXPENSE_CATEGORIES.other;
                const pct = summary.totalUsd > 0 ? Math.round((val / summary.totalUsd) * 100) : 0;
                return (
                  <div key={catId} className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                      <span>{cat.km}</span>
                      <span className="tabular-nums">{formatUSD(val)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600">
                <th className="py-3 px-4">ប្រភេទ & បរិយាយចំណាយ</th>
                <th className="py-3 px-3">អ្នកផ្គត់ផ្គង់ / ចុងភៅ</th>
                <th className="py-3 px-4 text-right">ទឹកប្រាក់សរុប</th>
                <th className="py-3 px-4 text-right">បានបង់រួច</th>
                <th className="py-3 px-4 text-right">នៅខ្វះ</th>
                <th className="py-3 px-3">ស្ថានភាព</th>
                <th className="py-3 px-4 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    មិនទាន់មានកំណត់ត្រាចំណាយសម្រាប់កម្មវិធីនេះនៅឡើយទេ
                  </td>
                </tr>
              ) : (
                expenses.map((ex) => {
                  const cat = EXPENSE_CATEGORIES[ex.category] || EXPENSE_CATEGORIES.other;
                  const totEq = Number(ex.total_amount_usd) + Number(ex.total_amount_khr) / rate;
                  const paidEq = Number(ex.paid_amount_usd) + Number(ex.paid_amount_khr) / rate;
                  const dueEq = Math.max(0, totEq - paidEq);

                  return (
                    <tr key={ex.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white mb-1"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.km}
                        </span>
                        <div className="font-extrabold text-slate-900 text-sm">{ex.item_name}</div>
                        {ex.notes && <div className="text-[11px] text-slate-500">{ex.notes}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{ex.vendor_name || '—'}</div>
                        <div className="text-[11px] text-slate-500">{ex.vendor_phone}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums text-slate-900">
                        {Number(ex.total_amount_usd) > 0 && <div>{formatUSD(ex.total_amount_usd)}</div>}
                        {Number(ex.total_amount_khr) > 0 && (
                          <div className="text-[11px] text-sky-700">{formatKHR(ex.total_amount_khr)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-emerald-700">
                        {formatUSD(paidEq)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums text-rose-600">
                        {dueEq > 0 ? formatUSD(dueEq) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {ex.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> បង់ផ្តាច់
                          </span>
                        ) : ex.payment_status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                            <Clock className="w-3 h-3" /> កក់មុនខ្លះ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> មិនទាន់បង់
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(ex)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ex)}
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

      {/* Add/Edit Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="text-sm font-bold">
                {editingExp ? 'កែប្រែកំណត់ត្រាចំណាយ' : 'កត់ត្រាចំណាយកម្មវិធីថ្មី'}
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ប្រភេទចំណាយ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                >
                  {Object.values(EXPENSE_CATEGORIES).map((c) => (
                    <option key={c.id} value={c.id}>{c.km}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះ/បរិយាយចំណាយ *</label>
                <input
                  type="text"
                  required
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  placeholder="ឧ. ម្ហូបភ្ញៀវ ៤០តុ ឬ សម្អាងការ"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះអ្នកផ្គត់ផ្គង់</label>
                  <input
                    type="text"
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">លេខទូរស័ព្ទអ្នកផ្គត់ផ្គង់</label>
                  <input
                    type="text"
                    value={form.vendor_phone}
                    onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">ត្រូវបង់សរុប ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.total_amount_usd}
                    onChange={(e) => setForm({ ...form, total_amount_usd: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">បានបង់/កក់រួច ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.paid_amount_usd}
                    onChange={(e) => setForm({ ...form, paid_amount_usd: e.target.value })}
                    placeholder="ទុកទទេបើបង់ផ្តាច់"
                    className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">ត្រូវបង់បន្ថែមជារៀល (៛)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.total_amount_khr}
                    onChange={(e) => setForm({ ...form, total_amount_khr: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">បានបង់រួចជារៀល (៛)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.paid_amount_khr}
                    onChange={(e) => setForm({ ...form, paid_amount_khr: e.target.value })}
                    className="w-full rounded-xl border border-sky-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">កំណត់សម្គាល់</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                  {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកចំណាយ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
