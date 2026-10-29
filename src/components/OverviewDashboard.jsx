import React from 'react';
import {
  Sparkles,
  PlusCircle,
  BookOpen,
  QrCode,
  Calculator,
  ArrowUpRight,
  Users,
  Wallet,
  Scale,
  Receipt,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HeartHandshake,
  Printer,
} from 'lucide-react';
import {
  EVENT_TYPES,
  PAYMENT_METHODS,
  formatUSD,
  formatKHR,
  formatKhmerDate,
} from '../constants/catalog';

export default function OverviewDashboard({
  bootstrap,
  activeEvent,
  activeWorkspace,
  onSelectEvent,
  onNavigate,
  onOpenNewEventWithType,
  onViewReceipt,
  onOpenPrintBook,
}) {
  const events = bootstrap?.events || [];
  const totals = bootstrap?.globalTotals || {};
  const recent = bootstrap?.recentContributions || [];
  const evType = activeEvent ? EVENT_TYPES[activeEvent.event_type] || EVENT_TYPES.wedding : EVENT_TYPES.wedding;

  return (
    <div className="space-y-6">
      {/* Royal Ceremonial Hero Spotlight */}
      {activeEvent ? (
        <div className="relative overflow-hidden rounded-2xl khmer-royal-bg text-white p-6 sm:p-8 shadow-xl border border-amber-500/30">
          {/* Subtle decorative glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
                  <span>{evType.emoji}</span>
                  <span>កម្មវិធីកំពុងជ្រើសរើស • {evType.km}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-xs">
                  កូដ៖ {activeEvent.code}
                </span>
                {activeEvent.stats?.pending_online_count > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigate('ledger')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white text-xs font-semibold animate-pulse cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    រង់ចាំផ្ទៀងផ្ទាត់អនឡាញ {activeEvent.stats.pending_online_count}
                  </button>
                )}
              </div>

              <h1 className="font-moul text-xl sm:text-2xl lg:text-3xl text-amber-100 leading-relaxed">
                {activeEvent.title}
              </h1>

              {activeEvent.host_names && (
                <p className="text-sm text-slate-200 font-medium">{activeEvent.host_names}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  {formatKhmerDate(activeEvent.event_date)} • ម៉ោង {activeEvent.event_time}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  {activeEvent.location_name || activeEvent.province} ({activeEvent.province})
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-200">
                  1 USD = {Number(activeEvent.exchange_rate || 4000).toLocaleString()} ៛
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('desk')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  បើកតុទទួលភ្ញៀវកត់ត្រារហ័ស
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('ledger')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white font-semibold text-sm border border-white/15 transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  មើលសៀវភៅចំណងដៃ ({activeEvent.stats?.total_entries || 0})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('einvite')}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white font-semibold text-sm border border-white/15 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-300" />
                  ធៀបឌីជីថល & KHQR
                </button>
                <button
                  type="button"
                  onClick={onOpenPrintBook}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white font-semibold text-sm border border-white/15 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-sky-300" />
                  បោះពុម្ពសៀវភៅ
                </button>
              </div>
            </div>

            {/* Active Event Live Dual-Currency Summary Card */}
            <div className="lg:w-96 shrink-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-amber-200">
                <span className="font-semibold">ចំណងដៃប្រមូលបានក្នុងកម្មវិធីនេះ</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold">
                  {activeEvent.stats?.total_entries || 0} កំណត់ត្រា
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-950/40 p-3 border border-white/10">
                  <div className="text-[11px] text-slate-300">ប្រាក់ដុល្លារសុទ្ធ (USD)</div>
                  <div className="text-xl font-extrabold text-emerald-300 tabular-nums mt-0.5">
                    {formatUSD(activeEvent.stats?.sum_usd)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950/40 p-3 border border-white/10">
                  <div className="text-[11px] text-slate-300">ប្រាក់រៀលសុទ្ធ (KHR)</div>
                  <div className="text-xl font-extrabold text-sky-300 tabular-nums mt-0.5">
                    {formatKHR(activeEvent.stats?.sum_khr)}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-400/30 p-3.5">
                <div className="flex items-center justify-between text-xs text-amber-200">
                  <span>សរុបរួមគិតជាដុល្លារ</span>
                  <span>គិតជារៀលសរុប</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-white tabular-nums">
                    {formatUSD(activeEvent.stats?.combined_usd)}
                  </span>
                  <span className="text-sm font-bold text-amber-300 tabular-nums">
                    ≈ {formatKHR(activeEvent.stats?.combined_khr)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Switcher Pill Bar across Hosted Events */}
          {events.length > 1 && (
            <div className="relative mt-6 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-slate-300 shrink-0 mr-1">ប្តូរកម្មវិធីរហ័ស៖</span>
              {events.map((ev) => {
                const t = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
                const isSelected = ev.id === activeEvent.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span className="max-w-[200px] truncate">{ev.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl khmer-royal-bg text-white p-8 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="font-moul text-2xl">សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ កត់ចំណងដៃ Pro</h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            មិនទាន់មានកម្មវិធីនៅឡើយទេ។ សូមបង្កើតកម្មវិធីដំបូងរបស់លោកអ្នក (មង្គលការ ឡើងផ្ទះ បុណ្យទាន ខួបកំណើត ឬកម្មវិធីផ្សេងៗ) ដើម្បីចាប់ផ្តើមកត់ត្រាចំណងដៃ!
          </p>
          <button
            type="button"
            onClick={() => onOpenNewEventWithType('wedding')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            បង្កើតកម្មវិធីថ្មីឥឡូវនេះ
          </button>
        </div>
      )}

      {/* Global Multi-Event KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ចំណងដៃសរុបគ្រប់កម្មវិធី</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-2">
            {formatUSD(totals.combined_usd)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            ដុល្លារសុទ្ធ {formatUSD(totals.sum_usd)} + រៀល {formatKHR(totals.sum_khr)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ភ្ញៀវបានចងដៃសរុប</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-2">
            {totals.total_entries || 0} <span className="text-sm font-semibold text-slate-500">កំណត់ត្រា</span>
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            ក្នុងចំណោមកម្មវិធីសរុប {totals.total_events || 0} កម្មវិធី
          </div>
        </div>

        <div
          onClick={() => onNavigate('expenses')}
          className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ចំណាយសរុប vs សមតុល្យ</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-2">
            {formatUSD(totals.expenses_usd)}
          </div>
          <div
            className={`text-xs font-semibold mt-1 tabular-nums ${
              (totals.net_surplus_usd || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {(totals.net_surplus_usd || 0) >= 0 ? 'នៅសល់ចំណេញ៖ +' : 'ខ្វះថវិកា៖ '}
            {formatUSD(totals.net_surplus_usd)}
          </div>
        </div>

        <div
          onClick={() => onNavigate('reciprocity')}
          className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ចងដៃកម្មវិធីគេ (ទៅវិញទៅមក)</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-2">
            {formatUSD(totals.outgoing_combined_usd)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>បានកត់ត្រា {totals.outgoing_count || 0} កម្មវិធីគេ</span>
            <span className="text-amber-700 font-semibold inline-flex items-center">
              ផ្ទៀងផ្ទាត់ <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* All Ceremony Types Grid ("គ្រប់កម្មវិធី") */}
      <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              គាំទ្រគ្រប់ប្រភេទកម្មវិធីបុណ្យទាន និងពិធីមង្គលខ្មែរទាំងអស់
            </h2>
            <p className="text-xs text-slate-500">
              ចុចលើប្រភេទកម្មវិធីណាមួយខាងក្រោម ដើម្បីបង្កើតសៀវភៅកត់ត្រាចំណងដៃថ្មីតាមប្រភេទពិធីនីមួយៗ
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
          >
            គ្រប់គ្រងកម្មវិធីទាំងអស់ ({events.length}) <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Object.values(EVENT_TYPES).map((type) => {
            const countOfType = events.filter((e) => e.event_type === type.id).length;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onOpenNewEventWithType(type.id)}
                className="group flex flex-col items-center text-center p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition cursor-pointer"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                  {type.emoji}
                </span>
                <span className="text-xs font-bold text-slate-800 leading-snug">{type.km}</span>
                <span className="text-[10px] text-slate-500 mt-1">
                  {countOfType > 0 ? `${countOfType} កម្មវិធី` : '+ បង្កើតថ្មី'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Section: Recent Live Feed + Quick Workflow Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Live Chongdai Feed */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ចំណងដៃទើបកត់ត្រាថ្មីៗបំផុត (Live Feed)
              </h3>
              <p className="text-xs text-slate-500">បង្ហាញកំណត់ត្រាចុងក្រោយពីគ្រប់តុទទួលភ្ញៀវ និងធៀបអនឡាញ</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              មើលបញ្ជីពេញ →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">មិនទាន់មានកំណត់ត្រាចំណងដៃនៅឡើយទេ</div>
            ) : (
              recent.slice(0, 8).map((c) => {
                const pm = PAYMENT_METHODS[c.payment_method] || PAYMENT_METHODS.cash;
                const evObj = events.find((e) => e.id === c.event_id) || activeEvent;
                return (
                  <div
                    key={c.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          #{c.receipt_no}
                        </span>
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {c.guest_title} {c.guest_name}
                        </span>
                        {c.verification_status === 'pending_online' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                            រង់ចាំផ្ទៀងផ្ទាត់
                          </span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {c.event_title} {c.guest_location ? `• មកពី ${c.guest_location}` : ''} • {pm.short}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {Number(c.amount_usd) > 0 && (
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                            {formatUSD(c.amount_usd)}
                          </div>
                        )}
                        {Number(c.amount_khr) > 0 && (
                          <div className="text-xs font-bold text-sky-700 tabular-nums">
                            {formatKHR(c.amount_khr)}
                          </div>
                        )}
                      </div>
                      {evObj && (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(c, evObj)}
                          title="មើលបង្កាន់ដៃថ្លែងអំណរគុណ"
                          className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-800 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Smart Ceremony Toolkit */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50/60 border border-amber-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              មុខងារពិសេសសម្រាប់ម្ចាស់កម្មវិធី
            </h3>

            <button
              type="button"
              onClick={() => onNavigate('cashcount')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">រាប់លុយក្នុងហិប & ផ្ទៀងផ្ទាត់</div>
                  <div className="text-[11px] text-slate-500">រាប់សន្លឹកប្រាក់ $ និង ៛ ធៀបនឹងសៀវភៅ</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('invitations')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">បញ្ជីភ្ញៀវអញ្ជើញ & រៀបចំតុ</div>
                  <div className="text-[11px] text-slate-500">
                    អញ្ជើញ {activeWorkspace?.invitations?.length || 0} គ្រួសារ • ផែនទីតុភ្ញៀវ
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reciprocity')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-800">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">ឆែកប្រវត្តិជំពាក់-សងចំណងដៃ</div>
                  <div className="text-[11px] text-slate-500">ដឹងភ្លាមថាគាត់ធ្លាប់ចងដៃយើងប៉ុន្មាន!</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">ក្រាហ្វិកវិភាគ & បម្រុងទុកទិន្នន័យ</div>
                  <div className="text-[11px] text-slate-500">របាយការណ៍លម្អិត និងនាំចេញ Excel/JSON</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
