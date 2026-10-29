import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import {
  USD_DENOMINATIONS,
  KHR_DENOMINATIONS,
  formatUSD,
  formatKHR,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

export default function CashReconciliation({
  activeEvent,
  workspace,
  onRefresh,
  notify,
}) {
  const [denoms, setDenoms] = useState({});
  const [countedBy, setCountedBy] = useState('គណៈកម្មការរាប់ប្រាក់');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.cashCount) {
      setDenoms(workspace.cashCount.denominations || {});
      setCountedBy(workspace.cashCount.counted_by || 'គណៈកម្មការរាប់ប្រាក់');
      setNotes(workspace.cashCount.notes || '');
    } else {
      setDenoms({});
      setCountedBy('គណៈកម្មការរាប់ប្រាក់');
      setNotes('');
    }
  }, [workspace?.cashCount, activeEvent?.id]);

  const countedTotals = useMemo(() => {
    let usd = 0;
    let khr = 0;
    for (const d of USD_DENOMINATIONS) {
      usd += (Number(denoms[d.key]) || 0) * d.value;
    }
    for (const d of KHR_DENOMINATIONS) {
      khr += (Number(denoms[d.key]) || 0) * d.value;
    }
    return { usd, khr };
  }, [denoms]);

  // Note: In ledger, cash envelopes can come from payment_method === 'cash' OR gift_item that also included cash!
  const bookTotals = useMemo(() => {
    const contributions = workspace?.contributions || [];
    let cashUsd = 0;
    let cashKhr = 0;
    let bankUsd = 0;
    let bankKhr = 0;

    for (const c of contributions) {
      if (c.payment_method === 'cash') {
        cashUsd += Number(c.amount_usd || 0);
        cashKhr += Number(c.amount_khr || 0);
      } else if (c.payment_method === 'gift_item') {
        // Gift items sometimes have cash alongside gold; show separately or include in non-cash note
        bankUsd += Number(c.amount_usd || 0);
        bankKhr += Number(c.amount_khr || 0);
      } else {
        bankUsd += Number(c.amount_usd || 0);
        bankKhr += Number(c.amount_khr || 0);
      }
    }
    return { cashUsd, cashKhr, bankUsd, bankKhr };
  }, [workspace?.contributions]);

  const diffUsd = countedTotals.usd - bookTotals.cashUsd;
  const diffKhr = countedTotals.khr - bookTotals.cashKhr;

  const handleSave = async () => {
    if (!activeEvent) return;
    setSaving(true);
    try {
      await apiRequest(`/api/events/${activeEvent.id}/cash-count`, {
        method: 'PUT',
        body: JSON.stringify({
          denominations: denoms,
          counted_by: countedBy,
          notes,
        }),
      });
      notify('បានរក្សាទុកតារាងរាប់សាច់ប្រាក់ក្នុងហិបដោយជោគជ័យ!');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!activeEvent) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            រាប់សាច់ប្រាក់ក្នុងហិប & ផ្ទៀងផ្ទាត់សៀវភៅ • {activeEvent.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            បញ្ចូលចំនួនសន្លឹកប្រាក់តាមប្រភេទក្រដាសប្រាក់ដុល្លារ ($) និងរៀល (៛) ដើម្បីផ្ទៀងផ្ទាត់ជាមួយសៀវភៅកត់ត្រាសាច់ប្រាក់សុទ្ធ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDenoms({})}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> រាប់ឡើងវិញពីសូន្យ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកលទ្ធផលរាប់ប្រាក់'}
          </button>
        </div>
      </div>

      {/* Live Reconciliation Comparison Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
          <div className="text-xs font-extrabold text-emerald-900">
            ១. ផ្ទៀងផ្ទាត់សាច់ប្រាក់ដុល្លារក្នុងហិប (USD)
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>រាប់ជាក់ស្តែងក្នុងហិប៖</span>
            <strong className="text-base text-slate-900 tabular-nums">{formatUSD(countedTotals.usd)}</strong>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>ក្នុងសៀវភៅ (សាច់ប្រាក់សុទ្ធ)៖</span>
            <strong className="text-base text-emerald-800 tabular-nums">{formatUSD(bookTotals.cashUsd)}</strong>
          </div>
          <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-black">
            <span>លទ្ធផលផ្ទៀងផ្ទាត់៖</span>
            {diffUsd === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> ត្រូវគ្នាគត់ ($0)
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 ${diffUsd > 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                <AlertTriangle className="w-4 h-4" />
                {diffUsd > 0 ? `លើស +${formatUSD(diffUsd)}` : `ខ្វះ ${formatUSD(diffUsd)}`}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 space-y-2">
          <div className="text-xs font-extrabold text-sky-900">
            ២. ផ្ទៀងផ្ទាត់សាច់ប្រាក់រៀលក្នុងហិប (KHR)
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>រាប់ជាក់ស្តែងក្នុងហិប៖</span>
            <strong className="text-base text-slate-900 tabular-nums">{formatKHR(countedTotals.khr)}</strong>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>ក្នុងសៀវភៅ (សាច់ប្រាក់សុទ្ធ)៖</span>
            <strong className="text-base text-sky-800 tabular-nums">{formatKHR(bookTotals.cashKhr)}</strong>
          </div>
          <div className="pt-2 border-t border-sky-200 flex items-center justify-between text-xs font-black">
            <span>លទ្ធផលផ្ទៀងផ្ទាត់៖</span>
            {diffKhr === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> ត្រូវគ្នាគត់ (0 ៛)
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 ${diffKhr > 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                <AlertTriangle className="w-4 h-4" />
                {diffKhr > 0 ? `លើស +${formatKHR(diffKhr)}` : `ខ្វះ ${formatKHR(diffKhr)}`}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-2">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Landmark className="w-4 h-4" />
            ៣. ចំណងដៃតាមធនាគារ & ផ្សេងៗ (ក្រៅហិបសាច់ប្រាក់)
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>តាមធនាគារ / KHQR / វត្ថុ ($)៖</span>
            <strong className="text-base text-emerald-300 tabular-nums">{formatUSD(bookTotals.bankUsd)}</strong>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>តាមធនាគារ / KHQR / វត្ថុ (៛)៖</span>
            <strong className="text-base text-sky-300 tabular-nums">{formatKHR(bookTotals.bankKhr)}</strong>
          </div>
          <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-400">
            សូមផ្ទៀងផ្ទាត់ទឹកប្រាក់នេះជាមួយរបាយការណ៍គណនី ABA / ACLEDA / Wing របស់ម្ចាស់កម្មវិធី។
          </div>
        </div>
      </div>

      {/* Bill Denomination Calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* USD Bills */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between">
            <span className="text-sm font-extrabold">តារាងរាប់ក្រដាសប្រាក់ដុល្លារ (USD Bills)</span>
            <span className="text-base font-black text-emerald-300 tabular-nums">
              {formatUSD(countedTotals.usd)}
            </span>
          </div>
          <div className="p-4 divide-y divide-slate-100">
            {USD_DENOMINATIONS.map((d) => {
              const qty = Number(denoms[d.key]) || 0;
              const sub = qty * d.value;
              return (
                <div key={d.key} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="w-24 font-extrabold text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 text-center tabular-nums">
                    {d.label}
                  </div>
                  <span className="text-xs text-slate-400">×</span>
                  <input
                    type="number"
                    min="0"
                    value={denoms[d.key] ?? ''}
                    onChange={(e) => setDenoms({ ...denoms, [d.key]: e.target.value })}
                    placeholder="0 សន្លឹក"
                    className="w-32 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold text-center tabular-nums focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">=</span>
                  <div className="w-28 text-right font-extrabold text-sm text-slate-900 tabular-nums">
                    {formatUSD(sub)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHR Bills */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-sky-900 text-white flex items-center justify-between">
            <span className="text-sm font-extrabold">តារាងរាប់ក្រដាសប្រាក់រៀល (KHR Bills)</span>
            <span className="text-base font-black text-sky-300 tabular-nums">
              {formatKHR(countedTotals.khr)}
            </span>
          </div>
          <div className="p-4 divide-y divide-slate-100">
            {KHR_DENOMINATIONS.map((d) => {
              const qty = Number(denoms[d.key]) || 0;
              const sub = qty * d.value;
              return (
                <div key={d.key} className="py-2 flex items-center justify-between gap-3">
                  <div className="w-28 font-extrabold text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-lg py-1.5 text-center tabular-nums">
                    {d.label}
                  </div>
                  <span className="text-xs text-slate-400">×</span>
                  <input
                    type="number"
                    min="0"
                    value={denoms[d.key] ?? ''}
                    onChange={(e) => setDenoms({ ...denoms, [d.key]: e.target.value })}
                    placeholder="0 សន្លឹក"
                    className="w-28 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold text-center tabular-nums focus:border-sky-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">=</span>
                  <div className="w-32 text-right font-extrabold text-xs text-slate-900 tabular-nums">
                    {formatKHR(sub)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Committee Sign-off Note */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ឈ្មោះគណៈកម្មការរាប់ប្រាក់ / អ្នកទទួលខុសត្រូវ
          </label>
          <input
            type="text"
            value={countedBy}
            onChange={(e) => setCountedBy(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            កំណត់ហេតុផ្ទៀងផ្ទាត់សាច់ប្រាក់
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ឧ. រាប់ផ្ទៀងផ្ទាត់លើកទី១ នៅម៉ោង ១០:៣០យប់ ត្រូវគ្នាគត់"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
