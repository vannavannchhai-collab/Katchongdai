import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, Sparkles, MapPin, Calendar, Gift } from 'lucide-react';
import {
  EVENT_TYPES,
  PAYMENT_METHODS,
  SIDES,
  formatUSD,
  formatKHR,
  formatKhmerDate,
  toKhmerNumerals,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

export default function ReceiptModal({ contribution, event, onClose }) {
  const [qrUrl, setQrUrl] = useState('');
  const [useKhmerDigits, setUseKhmerDigits] = useState(false);

  useEffect(() => {
    if (!contribution || !event) return;
    const verifyText = `KATCHONGDAI|${event.code}|#${contribution.receipt_no}|${contribution.guest_name}|USD:${contribution.amount_usd}|KHR:${contribution.amount_khr}`;
    apiRequest(`/api/qrcode?text=${encodeURIComponent(verifyText)}&dark=%2392400e`)
      .then((res) => setQrUrl(res.dataUrl))
      .catch(() => {});
  }, [contribution, event]);

  if (!contribution || !event) return null;

  const evType = EVENT_TYPES[event.event_type] || EVENT_TYPES.wedding;
  const payMethod = PAYMENT_METHODS[contribution.payment_method] || PAYMENT_METHODS.cash;
  const sideInfo = SIDES[contribution.side] || SIDES.both;
  const rate = event.exchange_rate || 4000;
  const totalUsdEquiv = Number(contribution.amount_usd) + Number(contribution.amount_khr) / rate;

  const fmtText = (txt) => (useKhmerDigits ? toKhmerNumerals(txt) : txt);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="print-only-container relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border-2 border-amber-300 overflow-hidden my-auto">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-5 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>បង្កាន់ដៃថ្លែងអំណរគុណផ្លូវការ (Official Receipt)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseKhmerDigits(!useKhmerDigits)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
            >
              {useKhmerDigits ? 'លេខសកល (123)' : 'លេខខ្មែរ (១២៣)'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              បោះពុម្ព / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ornamental Khmer Receipt Body */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40">
          {/* Kingdom / Traditional Header */}
          <div className="text-center border-b-2 border-dashed border-amber-300 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-semibold mb-2">
              <span>{evType.emoji}</span>
              <span>{evType.km}</span>
            </div>
            <h2 className="font-moul text-lg sm:text-xl text-amber-900 leading-relaxed">
              {event.title}
            </h2>
            {event.host_names && (
              <p className="text-sm font-semibold text-slate-700 mt-1">{event.host_names}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                {fmtText(formatKhmerDate(event.event_date))} ({fmtText(event.event_time)})
              </span>
              {event.location_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  {event.location_name}, {event.province}
                </span>
              )}
            </div>
          </div>

          {/* Receipt Meta Row */}
          <div className="flex items-center justify-between py-3 text-xs text-slate-600 border-b border-amber-200/70">
            <div>
              <span className="text-slate-500">លេខបង្កាន់ដៃ៖ </span>
              <span className="font-bold text-slate-900 text-sm">#{fmtText(contribution.receipt_no)}</span>
              {contribution.envelope_no && (
                <span className="ml-2 text-slate-500">(ស្រោមសំបុត្រ: {fmtText(contribution.envelope_no)})</span>
              )}
            </div>
            <div>
              <span className="text-slate-500">កាលបរិច្ឆេទកត់ត្រា៖ </span>
              <span className="font-medium text-slate-800">
                {fmtText(String(contribution.created_at || '').slice(0, 16))}
              </span>
            </div>
          </div>

          {/* Guest Details */}
          <div className="my-5 rounded-xl bg-white border border-amber-200 p-4 shadow-xs">
            <div className="text-xs text-amber-800 font-semibold uppercase tracking-wider mb-1">
              សូមគោរពជូនចំពោះភ្ញៀវកិត្តិយស
            </div>
            <div className="text-xl font-bold text-slate-900">
              {contribution.guest_title} {contribution.guest_name}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
              {contribution.guest_location && (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  មកពី៖ {contribution.guest_location}
                </span>
              )}
              {event.event_type === 'wedding' && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  {sideInfo.km}
                </span>
              )}
              {contribution.table_number && (
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                  លេខតុ៖ {fmtText(contribution.table_number)}
                </span>
              )}
            </div>
          </div>

          {/* Contribution Amount Highlight Box */}
          <div className="rounded-xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white p-5 shadow-md">
            <div className="flex items-center justify-between text-xs text-amber-200 mb-2">
              <span>ចំនួនទឹកប្រាក់ចំណងដៃដែលបានទទួល</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white font-medium">
                {payMethod.km}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-amber-200">ប្រាក់ដុល្លារ (USD)</div>
                <div className="text-2xl font-extrabold tabular-nums mt-0.5">
                  {fmtText(formatUSD(contribution.amount_usd))}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-amber-200">ប្រាក់រៀល (KHR)</div>
                <div className="text-2xl font-extrabold tabular-nums mt-0.5">
                  {fmtText(formatKHR(contribution.amount_khr))}
                </div>
              </div>
            </div>
            {contribution.gift_description && (
              <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center gap-2 text-sm text-amber-100">
                <Gift className="w-4 h-4 shrink-0 text-amber-300" />
                <span>វត្ថុអនុស្សាវរីយ៍បន្ថែម៖ <strong>{contribution.gift_description}</strong></span>
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-amber-200">
              <span>សមមូលសរុបរួម (អត្រា 1$ = {fmtText(rate.toLocaleString())}៛)</span>
              <span className="font-bold text-white text-sm">
                ≈ {fmtText(formatUSD(totalUsdEquiv))} / {fmtText(formatKHR(totalUsdEquiv * rate))}
              </span>
            </div>
          </div>

          {contribution.blessing_note && (
            <div className="mt-4 rounded-xl bg-amber-50/90 border border-amber-200 px-4 py-3 text-xs text-slate-700 italic">
              “{contribution.blessing_note}”
            </div>
          )}

          {/* Thank You Message + QR Verification */}
          <div className="mt-5 pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs text-slate-700 leading-relaxed">
                {event.greeting_message || evType.defaultGreeting}
              </p>
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-[11px] text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>កត់ត្រាដោយ៖ {contribution.recorded_by}</span>
              </div>
            </div>
            {qrUrl && (
              <div className="shrink-0 flex flex-col items-center bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                <img src={qrUrl} alt="Receipt QR" className="w-20 h-20" />
                <span className="text-[10px] text-slate-500 mt-0.5">ផ្ទៀងផ្ទាត់បង្កាន់ដៃ</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
