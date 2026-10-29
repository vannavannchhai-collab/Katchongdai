import React, { useState } from 'react';
import { X, Printer, BookOpenCheck } from 'lucide-react';
import {
  EVENT_TYPES,
  PAYMENT_METHODS,
  GUEST_GROUPS,
  SIDES,
  formatUSD,
  formatKHR,
  formatKhmerDate,
  toKhmerNumerals,
} from '../constants/catalog';

export default function PrintBookModal({ event, contributions, onClose }) {
  const [khmerDigits, setKhmerDigits] = useState(false);

  if (!event) return null;
  const evType = EVENT_TYPES[event.event_type] || EVENT_TYPES.wedding;
  const rate = event.exchange_rate || 4000;
  const ordered = [...(contributions || [])].sort((a, b) =>
    String(a.receipt_no).localeCompare(String(b.receipt_no), undefined, { numeric: true })
  );

  const sumUsd = ordered.reduce((s, c) => s + Number(c.amount_usd || 0), 0);
  const sumKhr = ordered.reduce((s, c) => s + Number(c.amount_khr || 0), 0);
  const combinedUsd = sumUsd + sumKhr / rate;
  const combinedKhr = sumKhr + sumUsd * rate;

  const fmt = (v) => (khmerDigits ? toKhmerNumerals(v) : v);

  return (
    <div className="print-overlay-backdrop fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs overflow-y-auto p-3 sm:p-6">
      <div className="print-only-container max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl border border-amber-300 overflow-hidden">
        {/* Top Controls (Hidden on Print) */}
        <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold">សៀវភៅបញ្ជីកត់ត្រាចំណងដៃផ្លូវការ (Official Print Ledger Book)</div>
              <div className="text-xs text-slate-400">រៀបចំសម្រាប់បោះពុម្ពលើក្រដាស A4 ឬរក្សាទុកជាឯកសារ PDF</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKhmerDigits(!khmerDigits)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
            >
              {khmerDigits ? 'ប្រើលេខសកល (123)' : 'ប្រើលេខខ្មែរ (១២៣)'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              បោះពុម្ពសៀវភៅ (Print / Save PDF)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Document Content */}
        <div className="p-6 sm:p-10 text-slate-900">
          {/* Kingdom & Ceremony Header */}
          <div className="text-center pb-6 border-b-2 border-amber-700">
            <div className="font-moul text-sm text-amber-900">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div className="font-moul text-xs text-amber-800 mt-0.5 mb-3">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div className="inline-block px-4 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
              សៀវភៅកត់ត្រាចំណងដៃផ្លូវការ • {evType.km}
            </div>
            <h1 className="font-moul text-xl sm:text-2xl text-slate-900 mt-1">{event.title}</h1>
            {event.host_names && (
              <p className="text-sm font-semibold text-slate-700 mt-1">{event.host_names}</p>
            )}
            {event.parent_names && (
              <p className="text-xs text-slate-600 mt-0.5">{event.parent_names}</p>
            )}
            <p className="text-xs text-slate-600 mt-2">
              ថ្ងៃប្រារព្ធពិធី៖ <strong>{fmt(formatKhmerDate(event.event_date))}</strong> • ទីតាំង៖{' '}
              <strong>{event.location_name || '—'} ({event.province})</strong> • អត្រាប្តូរប្រាក់៖{' '}
              <strong>1 USD = {fmt(rate.toLocaleString())} ៛</strong>
            </p>
          </div>

          {/* Executive Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
            <div className="rounded-xl border border-slate-300 p-3 bg-slate-50">
              <div className="text-xs text-slate-600">ចំនួនភ្ញៀវចងដៃសរុប</div>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                {fmt(ordered.length)} នាក់/គ្រួសារ
              </div>
            </div>
            <div className="rounded-xl border border-emerald-300 p-3 bg-emerald-50/60">
              <div className="text-xs text-emerald-800">សរុបប្រាក់ដុល្លារសុទ្ធ (USD)</div>
              <div className="text-lg font-extrabold text-emerald-900 tabular-nums mt-0.5">
                {fmt(formatUSD(sumUsd))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-300 p-3 bg-sky-50/60">
              <div className="text-xs text-sky-800">សរុបប្រាក់រៀលសុទ្ធ (KHR)</div>
              <div className="text-lg font-extrabold text-sky-900 tabular-nums mt-0.5">
                {fmt(formatKHR(sumKhr))}
              </div>
            </div>
            <div className="rounded-xl border border-amber-400 p-3 bg-amber-50">
              <div className="text-xs text-amber-900 font-semibold">សរុបរួមគិតជាដុល្លារ</div>
              <div className="text-lg font-extrabold text-amber-950 tabular-nums mt-0.5">
                {fmt(formatUSD(combinedUsd))}
              </div>
              <div className="text-[11px] text-amber-800 tabular-nums">
                ≈ {fmt(formatKHR(combinedKhr))}
              </div>
            </div>
          </div>

          {/* Official Numbered Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-amber-100/80 text-slate-900">
                  <th className="border border-slate-400 px-2 py-2 text-center w-14">ល.រ</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-left">គោត្តនាម និងនាមភ្ញៀវ</th>
                  <th className="border border-slate-400 px-2 py-2 text-left">មកពី / ក្រុម</th>
                  {event.event_type === 'wedding' && (
                    <th className="border border-slate-400 px-2 py-2 text-center">ខាង</th>
                  )}
                  <th className="border border-slate-400 px-2.5 py-2 text-right">ប្រាក់ដុល្លារ ($)</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-right">ប្រាក់រៀល (៛)</th>
                  <th className="border border-slate-400 px-2 py-2 text-center">វិធីបង់</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-left">វត្ថុអនុស្សាវរីយ៍ / ចំណាំ</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold tabular-nums">
                      {fmt(c.receipt_no)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-900">
                      {c.guest_title} {c.guest_name}
                      {c.table_number ? <span className="text-[10px] text-slate-500 ml-1">({c.table_number})</span> : null}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-slate-700">
                      {c.guest_location || (GUEST_GROUPS[c.guest_group]?.km ?? '')}
                    </td>
                    {event.event_type === 'wedding' && (
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        {SIDES[c.side]?.km || 'រួមគ្នា'}
                      </td>
                    )}
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold tabular-nums text-emerald-800">
                      {Number(c.amount_usd) > 0 ? fmt(formatUSD(c.amount_usd)) : '—'}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold tabular-nums text-sky-800">
                      {Number(c.amount_khr) > 0 ? fmt(formatKHR(c.amount_khr)) : '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center">
                      {PAYMENT_METHODS[c.payment_method]?.short || c.payment_method}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-slate-600">
                      {[c.gift_description, c.blessing_note].filter(Boolean).join(' • ') || '—'}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr className="bg-amber-100/90 font-extrabold text-slate-950">
                  <td
                    colSpan={event.event_type === 'wedding' ? 4 : 3}
                    className="border border-slate-400 px-3 py-2.5 text-right"
                  >
                    សរុបទឹកប្រាក់ចំណងដៃទាំងអស់៖
                  </td>
                  <td className="border border-slate-400 px-2.5 py-2.5 text-right tabular-nums text-emerald-900">
                    {fmt(formatUSD(sumUsd))}
                  </td>
                  <td className="border border-slate-400 px-2.5 py-2.5 text-right tabular-nums text-sky-900">
                    {fmt(formatKHR(sumKhr))}
                  </td>
                  <td colSpan={2} className="border border-slate-400 px-2.5 py-2.5 text-left text-amber-950">
                    សរុបរួម ≈ {fmt(formatUSD(combinedUsd))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-10 pt-4 text-center text-xs text-slate-700">
            <div>
              <div className="font-bold text-slate-900">ហត្ថលេខាអ្នកកត់ត្រាទី១</div>
              <div className="h-16" />
              <div className="border-t border-slate-400 w-40 mx-auto pt-1">ឈ្មោះ និងកាលបរិច្ឆេទ</div>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-slate-900">ហត្ថលេខាគណៈកម្មការរាប់ប្រាក់</div>
              <div className="h-16" />
              <div className="border-t border-slate-400 w-40 mx-auto pt-1">ឈ្មោះ និងកាលបរិច្ឆេទ</div>
            </div>
            <div>
              <div className="font-bold text-slate-900">ហត្ថលេខាម្ចាស់កម្មវិធី</div>
              <div className="h-16" />
              <div className="border-t border-slate-400 w-40 mx-auto pt-1">{event.host_names || 'ម្ចាស់កម្មវិធី'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
