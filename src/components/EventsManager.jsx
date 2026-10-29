import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  X,
  QrCode,
  Users,
} from 'lucide-react';
import {
  EVENT_TYPES,
  PROVINCES,
  formatUSD,
  formatKHR,
  formatKhmerDate,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

const EMPTY_EVENT = {
  title: '',
  event_type: 'wedding',
  host_names: '',
  parent_names: '',
  event_date: new Date().toISOString().slice(0, 10),
  event_time: '17:00',
  location_name: '',
  province: 'សៀមរាប',
  address: '',
  exchange_rate: 4000,
  target_budget_usd: 5000,
  expected_guests: 300,
  total_tables: 30,
  seats_per_table: 10,
  price_per_table_usd: 150,
  khqr_aba_name: '',
  khqr_aba_account: '',
  khqr_acleda_account: '',
  khqr_wing_account: '',
  greeting_message: EVENT_TYPES.wedding.defaultGreeting,
  status: 'active',
};

export default function EventsManager({
  events,
  activeEventId,
  presetCreateType,
  onClearPresetType,
  onSelectEvent,
  onOpenDeskForEvent,
  onRefresh,
  notify,
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presetCreateType) {
      const tInfo = EVENT_TYPES[presetCreateType] || EVENT_TYPES.wedding;
      setEditingEvent(null);
      setForm({
        ...EMPTY_EVENT,
        event_type: presetCreateType,
        greeting_message: tInfo.defaultGreeting,
      });
      setModalOpen(true);
      if (onClearPresetType) onClearPresetType();
    }
  }, [presetCreateType, onClearPresetType]);

  const openCreate = (type = 'wedding') => {
    const tInfo = EVENT_TYPES[type] || EVENT_TYPES.wedding;
    setEditingEvent(null);
    setForm({
      ...EMPTY_EVENT,
      event_type: type,
      greeting_message: tInfo.defaultGreeting,
    });
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title || '',
      event_type: ev.event_type || 'wedding',
      host_names: ev.host_names || '',
      parent_names: ev.parent_names || '',
      event_date: ev.event_date || '',
      event_time: ev.event_time || '17:00',
      location_name: ev.location_name || '',
      province: ev.province || 'សៀមរាប',
      address: ev.address || '',
      exchange_rate: ev.exchange_rate || 4000,
      target_budget_usd: ev.target_budget_usd || 0,
      expected_guests: ev.expected_guests || 200,
      total_tables: ev.total_tables || 20,
      seats_per_table: ev.seats_per_table || 10,
      price_per_table_usd: ev.price_per_table_usd || 150,
      khqr_aba_name: ev.khqr_aba_name || '',
      khqr_aba_account: ev.khqr_aba_account || '',
      khqr_acleda_account: ev.khqr_acleda_account || '',
      khqr_wing_account: ev.khqr_wing_account || '',
      greeting_message: ev.greeting_message || '',
      status: ev.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      notify('សូមបញ្ចូលឈ្មោះកម្មវិធី!', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingEvent) {
        await apiRequest(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        notify('បានកែប្រែព័ត៌មានកម្មវិធីដោយជោគជ័យ!');
      } else {
        const created = await apiRequest('/api/events', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        notify('បានបង្កើតកម្មវិធីថ្មីដោយជោគជ័យ!');
        if (created?.id) onSelectEvent(created.id);
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`តើលោកអ្នកពិតជាចង់លុបកម្មវិធី "${ev.title}" និងទិន្នន័យពាក់ព័ន្ធទាំងអស់មែនទេ?`)) {
      return;
    }
    try {
      await apiRequest(`/api/events/${ev.id}`, { method: 'DELETE' });
      notify('បានលុបកម្មវិធីរួចរាល់');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const filtered =
    typeFilter === 'all' ? events : events.filter((e) => e.event_type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            គ្រប់គ្រងកម្មវិធីទាំងអស់ (All Ceremonies & Events)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            បង្កើត និងគ្រប់គ្រងសៀវភៅកត់ត្រាចំណងដៃដាច់ដោយឡែកសម្រាប់មង្គលការ ឡើងផ្ទះ បុណ្យកឋិន បុណ្យសព ខួបកំណើត និងគ្រប់កម្មវិធី
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate('wedding')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          បង្កើតកម្មវិធីថ្មី
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          ទាំងអស់ ({events.length})
        </button>
        {Object.values(EVENT_TYPES).map((t) => {
          const cnt = events.filter((e) => e.event_type === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.km}</span>
              {cnt > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/10 text-[10px]">{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Event Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="text-3xl">📒</div>
          <div className="text-base font-bold text-slate-800">មិនទាន់មានកម្មវិធីក្នុងប្រភេទនេះនៅឡើយទេ</div>
          <button
            type="button"
            onClick={() => openCreate(typeFilter === 'all' ? 'wedding' : typeFilter)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            បង្កើតកម្មវិធីថ្មីឥឡូវនេះ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((ev) => {
            const t = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
            const isSelected = ev.id === activeEventId;
            return (
              <div
                key={ev.id}
                className={`rounded-2xl bg-white border-2 transition overflow-hidden shadow-xs ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className={`px-5 py-4 bg-gradient-to-r ${t.cardBg} border-b border-slate-200/70 flex items-start justify-between gap-3`}>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.badgeClass}`}>
                        <span>{t.emoji}</span>
                        <span>{t.km}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{ev.code}</span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> កំពុងប្រើប្រាស់
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{ev.title}</h3>
                    {ev.host_names && <p className="text-xs text-slate-600">{ev.host_names}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      title="កែប្រែកម្មវិធី"
                      className="p-2 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev)}
                      title="លុបកម្មវិធី"
                      className="p-2 rounded-lg bg-white/80 hover:bg-rose-50 border border-slate-200 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      {formatKhmerDate(ev.event_date)} ({ev.event_time})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {ev.location_name || '—'} ({ev.province})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {ev.total_tables} តុ • អត្រា {Number(ev.exchange_rate).toLocaleString()}៛
                    </span>
                  </div>

                  {/* Stats Mini Grid */}
                  <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                    <div>
                      <div className="text-[11px] text-slate-500">ភ្ញៀវចងដៃ</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {ev.stats?.total_entries || 0} នាក់
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">ដុល្លារ + រៀល</div>
                      <div className="text-xs font-bold text-emerald-700 tabular-nums mt-0.5">
                        {formatUSD(ev.stats?.sum_usd)}
                      </div>
                      <div className="text-[11px] font-semibold text-sky-700 tabular-nums">
                        {formatKHR(ev.stats?.sum_khr)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">សរុបរួម (USD)</div>
                      <div className="text-sm font-black text-amber-800 tabular-nums mt-0.5">
                        {formatUSD(ev.stats?.combined_usd)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {ev.khqr_aba_account ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <QrCode className="w-3.5 h-3.5" /> ABA KHQR: {ev.khqr_aba_account}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">មិនទាន់ដាក់លេខគណនី KHQR</span>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(ev.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        }`}
                      >
                        {isSelected ? 'បានជ្រើសរើស' : 'ជ្រើសរើសកម្មវិធីនេះ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDeskForEvent(ev.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                      >
                        កត់ចំណងដៃ <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-base font-bold">
                {editingEvent ? 'កែប្រែព័ត៌មានកម្មវិធី' : 'បង្កើតកម្មវិធីកត់ត្រាចំណងដៃថ្មី'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Ceremony Type Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ១. ជ្រើសរើសប្រភេទកម្មវិធី *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(EVENT_TYPES).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          event_type: t.id,
                          greeting_message:
                            !editingEvent ? t.defaultGreeting : f.greeting_message,
                        }))
                      }
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                        form.event_type === t.id
                          ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <span className="leading-tight">{t.km}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ឈ្មោះកម្មវិធីផ្លូវការ *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="ឧ. ពិធីមង្គលការ វណ្ណា វិបុល & សុខ សុជាតា"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ឈ្មោះម្ចាស់កម្មវិធី / កូនប្រុស-កូនស្រី
                  </label>
                  <input
                    type="text"
                    value={form.host_names}
                    onChange={(e) => setForm({ ...form, host_names: e.target.value })}
                    placeholder="ឧ. លោក វណ្ណា វិបុល និង កញ្ញា សុខ សុជាតា"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ឈ្មោះមាតាបិតា / ម្ចាស់ដើមបុណ្យ
                  </label>
                  <input
                    type="text"
                    value={form.parent_names}
                    onChange={(e) => setForm({ ...form, parent_names: e.target.value })}
                    placeholder="ឧ. លោក ... និងអ្នកស្រី ..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    កាលបរិច្ឆេទប្រារព្ធពិធី *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ម៉ោងទទួលភ្ញៀវ
                  </label>
                  <input
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ទីតាំងប្រារព្ធពិធី (សាលមហោស្រព / គេហដ្ឋាន / វត្ត)
                  </label>
                  <input
                    type="text"
                    value={form.location_name}
                    onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                    placeholder="ឧ. មជ្ឈមណ្ឌលអង្គរផាឡេស អាគារ A"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    រាជធានី / ខេត្ត
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none bg-white"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Financial & Table Config */}
              <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-4 space-y-3">
                <div className="text-xs font-bold text-amber-900">
                  ២. អត្រាប្តូរប្រាក់ & ការរៀបចំតុភ្ញៀវ
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      អត្រាប្តូរប្រាក់ (1$ = ?៛)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={form.exchange_rate}
                      onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ចំនួនតុសរុប
                    </label>
                    <input
                      type="number"
                      value={form.total_tables}
                      onChange={(e) => setForm({ ...form, total_tables: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      តម្លៃម្ហូបក្នុង ១តុ ($)
                    </label>
                    <input
                      type="number"
                      value={form.price_per_table_usd}
                      onChange={(e) => setForm({ ...form, price_per_table_usd: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ភ្ញៀវរំពឹងទុក (នាក់)
                    </label>
                    <input
                      type="number"
                      value={form.expected_guests}
                      onChange={(e) => setForm({ ...form, expected_guests: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Digital Bank KHQR Accounts */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  ៣. គណនីធនាគារទទួលចំណងដៃអនឡាញ (ABA KHQR / ACLEDA / Wing)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ឈ្មោះគណនី ABA (ជាអក្សរឡាតាំង)
                    </label>
                    <input
                      type="text"
                      value={form.khqr_aba_name}
                      onChange={(e) => setForm({ ...form, khqr_aba_name: e.target.value })}
                      placeholder="VANNA VIBOL"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      លេខគណនី ABA KHQR
                    </label>
                    <input
                      type="text"
                      value={form.khqr_aba_account}
                      onChange={(e) => setForm({ ...form, khqr_aba_account: e.target.value })}
                      placeholder="002 889 168"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      លេខទូរស័ព្ទ / គណនី ACLEDA ទាន់ចិត្ត
                    </label>
                    <input
                      type="text"
                      value={form.khqr_acleda_account}
                      onChange={(e) => setForm({ ...form, khqr_acleda_account: e.target.value })}
                      placeholder="092 778 899"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      លេខគណនី Wing Bank
                    </label>
                    <input
                      type="text"
                      value={form.khqr_wing_account}
                      onChange={(e) => setForm({ ...form, khqr_wing_account: e.target.value })}
                      placeholder="012 889 168"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  សារថ្លែងអំណរគុណលើបង្កាន់ដៃ និងធៀបឌីជីថល
                </label>
                <textarea
                  rows={2}
                  value={form.greeting_message}
                  onChange={(e) => setForm({ ...form, greeting_message: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'កំពុងរក្សាទុក...' : editingEvent ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតកម្មវិធីថ្មី'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
