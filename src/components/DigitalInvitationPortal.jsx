import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Sparkles,
  Calendar,
  MapPin,
  Send,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import {
  EVENT_TYPES,
  GUEST_TITLES,
  PAYMENT_METHODS,
  SIDES,
  formatKhmerDate,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

export default function DigitalInvitationPortal({
  activeEvent,
  onRefresh,
  onViewReceipt,
  notify,
}) {
  const [khqrImage, setKhqrImage] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [onlineForm, setOnlineForm] = useState({
    guest_title: 'លោក',
    guest_name: '',
    guest_phone: '',
    guest_location: '',
    side: 'both',
    amount_usd: '50',
    amount_khr: '',
    payment_method: 'aba_khqr',
    payment_ref: '',
    blessing_note: 'សូមជូនពរសុភមង្គល ជោគជ័យ និងរកទទួលទានមានបានជានិរន្តរ៍!',
  });

  useEffect(() => {
    if (!activeEvent) return;
    const payload = `KHQR|${activeEvent.khqr_aba_name || activeEvent.title}|ABA:${activeEvent.khqr_aba_account || '000-000-000'}|EVENT:${activeEvent.code}`;
    apiRequest(`/api/qrcode?text=${encodeURIComponent(payload)}&dark=%230f172a`)
      .then((res) => setKhqrImage(res.dataUrl))
      .catch(() => {});
  }, [activeEvent]);

  if (!activeEvent) return null;
  const evType = EVENT_TYPES[activeEvent.event_type] || EVENT_TYPES.wedding;

  const copyText = (label, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    notify(`បានចម្លង ${label} រួចរាល់!`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleOnlineSubmit = async (e) => {
    e.preventDefault();
    if (!onlineForm.guest_name.trim()) {
      notify('សូមបញ្ចូលឈ្មោះរបស់លោកអ្នក!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiRequest(`/api/public/events/${activeEvent.id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({
          ...onlineForm,
          amount_usd: Number(onlineForm.amount_usd) || 0,
          amount_khr: Number(onlineForm.amount_khr) || 0,
        }),
      });
      notify('បានផ្ញើចំណងដៃ និងពាក្យជូនពរអនឡាញចូលក្នុងសៀវភៅកម្មវិធីដោយជោគជ័យ!');
      await onRefresh();
      setOnlineForm((prev) => ({
        ...prev,
        guest_name: '',
        guest_phone: '',
        payment_ref: '',
      }));
      onViewReceipt(created, activeEvent);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            ធៀបអញ្ជើញឌីជីថល & ផតថលផ្ញើចំណងដៃអនឡាញ (E-Invitation & KHQR)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            សម្រាប់ភ្ញៀវនៅឆ្ងាយ ឬជាប់រវល់ អាចស្កេន KHQR ផ្ញើចំណងដៃ និងពាក្យជូនពរចូលក្នុងសៀវភៅកត់ត្រាដោយស្វ័យប្រវត្តិ
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          ភ្ជាប់ផ្ទាល់ទៅកាន់សៀវភៅចំណងដៃ (រង់ចាំផ្ទៀងផ្ទាត់)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Ceremonial Khmer E-Invitation Card + KHQR */}
        <div className="lg:col-span-7 rounded-3xl overflow-hidden border-2 border-amber-300 shadow-xl bg-gradient-to-b from-[#1e1b4b] via-[#17153b] to-[#0f172a] text-white">
          <div className="p-6 sm:p-8 text-center space-y-4 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>សំបុត្រអញ្ជើញឌីជីថល • {evType.km}</span>
            </div>

            <div className="text-4xl">{evType.emoji}</div>

            <h1 className="font-moul text-xl sm:text-2xl text-amber-200 leading-relaxed">
              {activeEvent.title}
            </h1>

            {activeEvent.parent_names && (
              <p className="text-xs text-slate-300 max-w-lg mx-auto">{activeEvent.parent_names}</p>
            )}

            {activeEvent.host_names && (
              <div className="py-2 px-4 rounded-2xl bg-white/10 border border-amber-400/30 inline-block">
                <div className="text-[11px] text-amber-300">សូមគោរពអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយសរបស់</div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {activeEvent.host_names}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-2">
              <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                  <Calendar className="w-4 h-4" /> កាលបរិច្ឆេទ និងម៉ោង
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {formatKhmerDate(activeEvent.event_date)}
                </div>
                <div className="text-xs text-slate-300">វេលាម៉ោង {activeEvent.event_time}</div>
              </div>

              <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                  <MapPin className="w-4 h-4" /> ទីតាំងប្រារព្ធពិធី
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {activeEvent.location_name || activeEvent.province}
                </div>
                <div className="text-xs text-slate-300">{activeEvent.address || activeEvent.province}</div>
              </div>
            </div>

            {/* Official KHQR Box */}
            <div className="max-w-md mx-auto mt-6 rounded-2xl bg-white text-slate-900 overflow-hidden shadow-lg border-2 border-amber-400">
              <div className="bg-[#E11D48] text-white px-4 py-2 flex items-center justify-between">
                <span className="font-black tracking-wider text-sm">KHQR • ចំណងដៃអនឡាញ</span>
                <QrCode className="w-4 h-4" />
              </div>
              <div className="p-5 flex flex-col items-center">
                <div className="text-xs font-extrabold text-slate-500 uppercase">
                  {activeEvent.khqr_aba_name || activeEvent.host_names || 'HOST ACCOUNT'}
                </div>
                {khqrImage && (
                  <img
                    src={khqrImage}
                    alt="KHQR Code"
                    className="w-44 h-44 my-2 rounded-xl border border-slate-200 p-1"
                  />
                )}
                <div className="w-full space-y-2 mt-2 text-left">
                  {activeEvent.khqr_aba_account && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-sky-900">ABA Bank: </span>
                        <span className="font-mono font-bold">{activeEvent.khqr_aba_account}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText('លេខគណនី ABA', activeEvent.khqr_aba_account)}
                        className="inline-flex items-center gap-1 text-amber-700 font-bold cursor-pointer"
                      >
                        {copiedField === 'លេខគណនី ABA' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        ចម្លង
                      </button>
                    </div>
                  )}
                  {activeEvent.khqr_acleda_account && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-blue-900">ACLEDA: </span>
                        <span className="font-mono font-bold">{activeEvent.khqr_acleda_account}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText('លេខគណនី ACLEDA', activeEvent.khqr_acleda_account)}
                        className="inline-flex items-center gap-1 text-amber-700 font-bold cursor-pointer"
                      >
                        {copiedField === 'លេខគណនី ACLEDA' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        ចម្លង
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-100/90 leading-relaxed max-w-lg mx-auto pt-2">
              {activeEvent.greeting_message || evType.defaultGreeting}
            </p>
          </div>
        </div>

        {/* RIGHT: Guest Self-Service Online Blessing & Chongdai Form */}
        <form
          onSubmit={handleOnlineSubmit}
          className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                ទម្រង់ភ្ញៀវផ្ញើចំណងដៃ & ពាក្យជូនពរអនឡាញ
              </h3>
              <p className="text-[11px] text-slate-500">
                បំពេញបន្ទាប់ពីផ្ទេរប្រាក់តាម KHQR ដើម្បីទទួលបង្កាន់ដៃថ្លែងអំណរគុណភ្លាមៗ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">គោរមងារ</label>
              <select
                value={onlineForm.guest_title}
                onChange={(e) => setOnlineForm({ ...onlineForm, guest_title: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
              >
                {GUEST_TITLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះរបស់លោកអ្នក *</label>
              <input
                type="text"
                required
                value={onlineForm.guest_name}
                onChange={(e) => setOnlineForm({ ...onlineForm, guest_name: e.target.value })}
                placeholder="ឧ. ចាន់ សុផល"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
              <input
                type="text"
                value={onlineForm.guest_phone}
                onChange={(e) => setOnlineForm({ ...onlineForm, guest_phone: e.target.value })}
                placeholder="012 xxx xxx"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">មកពីខេត្ត/ស្ថាប័ន</label>
              <input
                type="text"
                value={onlineForm.guest_location}
                onChange={(e) => setOnlineForm({ ...onlineForm, guest_location: e.target.value })}
                placeholder="ភ្នំពេញ"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">ចំណងដៃដុល្លារ ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={onlineForm.amount_usd}
                onChange={(e) => setOnlineForm({ ...onlineForm, amount_usd: e.target.value })}
                className="w-full rounded-xl border-2 border-emerald-300 px-3 py-2 text-base font-black text-emerald-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sky-800 mb-1">ចំណងដៃរៀល (៛)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={onlineForm.amount_khr}
                onChange={(e) => setOnlineForm({ ...onlineForm, amount_khr: e.target.value })}
                placeholder="0"
                className="w-full rounded-xl border-2 border-sky-300 px-3 py-2 text-base font-black text-sky-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ធនាគារដែលបានផ្ទេរ</label>
              <select
                value={onlineForm.payment_method}
                onChange={(e) => setOnlineForm({ ...onlineForm, payment_method: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                {Object.values(PAYMENT_METHODS)
                  .filter((m) => m.id !== 'cash' && m.id !== 'gift_item')
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.km}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ភ្ញៀវខាង</label>
              <select
                value={onlineForm.side}
                onChange={(e) => setOnlineForm({ ...onlineForm, side: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                {Object.values(SIDES).map((s) => (
                  <option key={s.id} value={s.id}>{s.km}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              លេខយោងប្រតិបត្តិការធនាគារ (ស្រេចចិត្ត)
            </label>
            <input
              type="text"
              value={onlineForm.payment_ref}
              onChange={(e) => setOnlineForm({ ...onlineForm, payment_ref: e.target.value })}
              placeholder="ឧ. លេខកូដចុងក្រោយ ៦ខ្ទង់ពី ABA"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">សារជូនពរម្ចាស់កម្មវិធី</label>
            <textarea
              rows={2}
              value={onlineForm.blessing_note}
              onChange={(e) => setOnlineForm({ ...onlineForm, blessing_note: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'កំពុងបញ្ជូន...' : 'ផ្ញើចំណងដៃ & ទទួលបង្កាន់ដៃអេឡិចត្រូនិក'}
          </button>
        </form>
      </div>
    </div>
  );
}
