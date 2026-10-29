import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  EVENT_TYPES,
  GUEST_TITLES,
  GUEST_GROUPS,
  PAYMENT_METHODS,
  PROVINCES,
  formatUSD,
  formatKHR,
  formatKhmerDate,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

const EMPTY_OUTGOING = {
  recipient_title: 'លោក',
  recipient_name: '',
  recipient_phone: '',
  recipient_location: 'សៀមរាប',
  relationship: 'friends',
  event_type: 'wedding',
  event_title: '',
  event_date: new Date().toISOString().slice(0, 10),
  amount_usd: '',
  amount_khr: '',
  exchange_rate: 4000,
  payment_method: 'cash',
  gift_description: '',
  returned_status: 'pending_return',
  notes: '',
};

export default function ReciprocityLedger({
  outgoingGifts,
  reciprocityDirectory,
  onRefresh,
  notify,
}) {
  const [subTab, setSubTab] = useState('lookup'); // 'lookup' | 'outgoing'
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'owe_them' | 'they_owe' | 'both_sides'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(EMPTY_OUTGOING);
  const [saving, setSaving] = useState(false);

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reciprocityDirectory || []).filter((p) => {
      if (filterMode === 'owe_them' && p.net_balance_usd <= 0) return false;
      if (filterMode === 'they_owe' && p.net_balance_usd >= 0) return false;
      if (
        filterMode === 'both_sides' &&
        (p.incoming_records.length === 0 || p.outgoing_records.length === 0)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.display_name.toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
      );
    });
  }, [reciprocityDirectory, search, filterMode]);

  const filteredOutgoing = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (outgoingGifts || []).filter((g) => {
      if (!q) return true;
      return (
        g.recipient_name.toLowerCase().includes(q) ||
        (g.event_title || '').toLowerCase().includes(q) ||
        (g.recipient_location || '').toLowerCase().includes(q)
      );
    });
  }, [outgoingGifts, search]);

  const openCreate = (prefillPerson = null) => {
    setEditingRow(null);
    if (prefillPerson) {
      setForm({
        ...EMPTY_OUTGOING,
        recipient_title: prefillPerson.display_title || 'លោក',
        recipient_name: prefillPerson.display_name || '',
        recipient_phone: prefillPerson.phone || '',
        recipient_location: prefillPerson.location || 'សៀមរាប',
        relationship: prefillPerson.group || 'friends',
        amount_usd: String(prefillPerson.suggested_return_usd || 50),
        returned_status: 'returning_theirs',
      });
    } else {
      setForm(EMPTY_OUTGOING);
    }
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({ ...row });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount_usd: Number(form.amount_usd) || 0,
        amount_khr: Number(form.amount_khr) || 0,
      };
      if (editingRow) {
        await apiRequest(`/api/outgoing-gifts/${editingRow.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify('បានកែប្រែកំណត់ត្រាចងដៃកម្មវិធីគេ!');
      } else {
        await apiRequest('/api/outgoing-gifts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('បានកត់ត្រាចំណងដៃដែលយើងទៅចងដៃកម្មវិធីគេរួចរាល់!');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`លុបកំណត់ត្រាចងដៃ "${row.recipient_title} ${row.recipient_name}"?`)) return;
    try {
      await apiRequest(`/api/outgoing-gifts/${row.id}`, { method: 'DELETE' });
      notify('បានលុបកំណត់ត្រារួចរាល់');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-600" />
            សៀវភៅចំណងដៃទៅវិញទៅមក (Reciprocity & Outgoing Chongdai)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ស្វែងរកឈ្មោះភ្ញៀវភ្លាមដឹងថាគាត់ធ្លាប់ចងដៃយើងប៉ុន្មាន និងយើងធ្លាប់ទៅចងដៃកម្មវិធីគាត់ប៉ុន្មាន គ្រប់ឆ្នាំទាំងអស់!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setSubTab('lookup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'lookup' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              ឆែកប្រវត្តិទៅវិញទៅមក ({reciprocityDirectory?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('outgoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'outgoing' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              បញ្ជីយើងចងដៃគេ ({outgoingGifts?.length || 0})
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> កត់ត្រាយើងទៅចងដៃគេ
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="វាយឈ្មោះភ្ញៀវ ដើម្បីឆែកប្រវត្តិចំណងដៃ..."
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        {subTab === 'lookup' && (
          <div className="flex flex-wrap gap-1.5">
            {[
              ['all', 'ភ្ញៀវទាំងអស់'],
              ['both_sides', 'ធ្លាប់ទៅវិញទៅមកទាំងសងខាង'],
              ['owe_them', 'គាត់ចងយើងច្រើនជាង (គួរសងវិញ)'],
              ['they_owe', 'យើងចងគាត់ច្រើនជាង'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterMode(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  filterMode === id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {subTab === 'lookup' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDirectory.map((person) => (
            <div
              key={person.key}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3.5 hover:border-amber-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {person.display_title} {person.display_name}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {person.location ? `${person.location} • ` : ''}
                    {GUEST_GROUPS[person.group]?.km || 'មិត្តភក្តិ'}
                    {person.phone ? ` • ${person.phone}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCreate(person)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold cursor-pointer"
                >
                  + កត់ចងដៃតប
                </button>
              </div>

              {/* Side-by-side Incoming vs Outgoing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> គាត់ចងដៃយើងសរុប
                  </div>
                  <div className="text-lg font-black text-emerald-950 tabular-nums mt-0.5">
                    {formatUSD(person.incoming_total_usd_equiv)}
                  </div>
                  <div className="space-y-1 mt-1.5">
                    {person.incoming_records.length === 0 ? (
                      <div className="text-[11px] text-slate-400">មិនទាន់មាន</div>
                    ) : (
                      person.incoming_records.map((r) => (
                        <div key={r.id} className="text-[11px] text-slate-700 truncate">
                          • {r.event_title}:{' '}
                          <strong>
                            {r.amount_usd > 0 ? `$${r.amount_usd}` : ''}
                            {r.amount_usd > 0 && r.amount_khr > 0 ? ' + ' : ''}
                            {r.amount_khr > 0 ? `${r.amount_khr.toLocaleString()}៛` : ''}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                    <ArrowUpRight className="w-3.5 h-3.5" /> យើងចងដៃគាត់សរុប
                  </div>
                  <div className="text-lg font-black text-rose-950 tabular-nums mt-0.5">
                    {formatUSD(person.outgoing_total_usd_equiv)}
                  </div>
                  <div className="space-y-1 mt-1.5">
                    {person.outgoing_records.length === 0 ? (
                      <div className="text-[11px] text-slate-400">មិនទាន់មាន</div>
                    ) : (
                      person.outgoing_records.map((r) => (
                        <div key={r.id} className="text-[11px] text-slate-700 truncate">
                          • {r.event_title}:{' '}
                          <strong>
                            {r.amount_usd > 0 ? `$${r.amount_usd}` : ''}
                            {r.amount_usd > 0 && r.amount_khr > 0 ? ' + ' : ''}
                            {r.amount_khr > 0 ? `${r.amount_khr.toLocaleString()}៛` : ''}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Smart Recommendation Footer */}
              <div className="rounded-xl bg-slate-50 px-3.5 py-2 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {person.net_balance_usd > 0
                    ? `គាត់ចងយើងលើស ${formatUSD(person.net_balance_usd)}`
                    : person.net_balance_usd < 0
                    ? `យើងចងគាត់លើស ${formatUSD(Math.abs(person.net_balance_usd))}`
                    : 'ចំណងដៃស្មើគ្នាល្អ'}
                </span>
                {person.net_balance_usd > 0 && (
                  <span className="font-extrabold text-amber-800">
                    គួរចងតប ≈ {formatUSD(person.suggested_return_usd)}+
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Outgoing Gifts Table */
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600">
                  <th className="py-3 px-4">ម្ចាស់កម្មវិធីដែលយើងទៅចងដៃ</th>
                  <th className="py-3 px-3">កម្មវិធី & កាលបរិច្ឆេទ</th>
                  <th className="py-3 px-4 text-right">ប្រាក់ដុល្លារ ($)</th>
                  <th className="py-3 px-4 text-right">ប្រាក់រៀល (៛)</th>
                  <th className="py-3 px-3">វិធីបង់ / វត្ថុ</th>
                  <th className="py-3 px-3">កំណត់សម្គាល់</th>
                  <th className="py-3 px-4 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOutgoing.map((g) => {
                  const evT = EVENT_TYPES[g.event_type] || EVENT_TYPES.wedding;
                  return (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {g.recipient_title} {g.recipient_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {g.recipient_location} {g.recipient_phone ? `• ${g.recipient_phone}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">
                          {evT.emoji} {g.event_title}
                        </div>
                        <div className="text-[11px] text-slate-500">{formatKhmerDate(g.event_date)}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-rose-700 tabular-nums">
                        {Number(g.amount_usd) > 0 ? formatUSD(g.amount_usd) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-sky-700 tabular-nums">
                        {Number(g.amount_khr) > 0 ? formatKHR(g.amount_khr) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">
                          {PAYMENT_METHODS[g.payment_method]?.short || g.payment_method}
                        </div>
                        {g.gift_description && (
                          <div className="text-[11px] text-amber-800">🎁 {g.gift_description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{g.notes || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(g)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(g)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Outgoing Gift */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="text-sm font-bold">
                {editingRow ? 'កែប្រែកំណត់ត្រាចងដៃកម្មវិធីគេ' : 'កត់ត្រាចំណងដៃដែលយើងទៅចូលរួមកម្មវិធីគេ'}
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
                    value={form.recipient_title}
                    onChange={(e) => setForm({ ...form, recipient_title: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
                  >
                    {GUEST_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះម្ចាស់កម្មវិធី *</label>
                  <input
                    type="text"
                    required
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    placeholder="ឧ. លោក សុខ ពិសិដ្ឋ"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ប្រភេទកម្មវិធី</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold"
                  >
                    {Object.values(EVENT_TYPES).map((t) => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.km}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">កាលបរិច្ឆេទ</label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះកម្មវិធីរបស់គាត់ *</label>
                <input
                  type="text"
                  required
                  value={form.event_title}
                  onChange={(e) => setForm({ ...form, event_title: e.target.value })}
                  placeholder="ឧ. ពិធីមង្គលការប្អូនស្រី លោក សុខ ពិសិដ្ឋ"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">ប្រាក់ដុល្លារ ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.amount_usd}
                    onChange={(e) => setForm({ ...form, amount_usd: e.target.value })}
                    className="w-full rounded-xl border border-rose-300 px-3 py-2 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">ប្រាក់រៀល (៛)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.amount_khr}
                    onChange={(e) => setForm({ ...form, amount_khr: e.target.value })}
                    className="w-full rounded-xl border border-sky-300 px-3 py-2 text-sm font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ទីតាំង/ខេត្ត</label>
                  <input
                    type="text"
                    list="out-provinces"
                    value={form.recipient_location}
                    onChange={(e) => setForm({ ...form, recipient_location: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <datalist id="out-provinces">
                    {PROVINCES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">វត្ថុអនុស្សាវរីយ៍បន្ថែម</label>
                  <input
                    type="text"
                    value={form.gift_description}
                    onChange={(e) => setForm({ ...form, gift_description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
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
