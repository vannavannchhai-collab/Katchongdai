import React, { useMemo, useRef } from 'react';
import {
  BarChart3,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Award,
  History,
  Database,
  Printer,
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  GUEST_GROUPS,
  SIDES,
  formatUSD,
  formatKHR,
} from '../constants/catalog';
import { apiRequest } from '../utils/api';

const CHART_COLORS = ['#f59e0b', '#10b981', '#0ea5e9', '#6366f1', '#ec4899', '#8b5cf6'];

export default function ReportsAndSettings({
  activeEvent,
  workspace,
  bootstrap,
  onOpenPrintBook,
  onRefresh,
  notify,
}) {
  const backupInputRef = useRef(null);
  const contributions = workspace?.contributions || [];
  const rate = activeEvent?.exchange_rate || 4000;
  const auditLogs = bootstrap?.auditLogs || [];

  const analytics = useMemo(() => {
    const byMethod = {};
    const byGroup = {};
    const bySide = {};
    let totalEq = 0;

    const ranked = contributions.map((c) => {
      const eq = Number(c.amount_usd || 0) + Number(c.amount_khr || 0) / rate;
      totalEq += eq;
      byMethod[c.payment_method] = (byMethod[c.payment_method] || 0) + eq;
      byGroup[c.guest_group] = (byGroup[c.guest_group] || 0) + eq;
      bySide[c.side] = (bySide[c.side] || 0) + eq;
      return { ...c, usdEquiv: eq };
    });

    ranked.sort((a, b) => b.usdEquiv - a.usdEquiv);

    return {
      totalEq,
      byMethod: Object.entries(byMethod).sort((a, b) => b[1] - a[1]),
      byGroup: Object.entries(byGroup).sort((a, b) => b[1] - a[1]),
      bySide: Object.entries(bySide).sort((a, b) => b[1] - a[1]),
      topContributors: ranked.slice(0, 8),
      avgPerGuest: contributions.length > 0 ? totalEq / contributions.length : 0,
    };
  }, [contributions, rate]);

  const handleExportJSON = async () => {
    try {
      const data = await apiRequest('/api/system/export-json');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Katchongdai_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('បានទាញយកឯកសារបម្រុងទុកទិន្នន័យ (JSON Backup) ដោយជោគជ័យ!');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await apiRequest('/api/system/import-json', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      notify('បានស្ដារទិន្នន័យបម្រុងទុកទាំងអស់ឡើងវិញដោយជោគជ័យ!');
      await onRefresh();
    } catch (err) {
      notify('ឯកសារបម្រុងទុកមិនត្រឹមត្រូវ៖ ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('តើលោកអ្នកចង់ស្ដារទិន្នន័យគំរូពេញលេញឡើងវិញមែនទេ?')) return;
    try {
      await apiRequest('/api/system/reset-demo', { method: 'POST' });
      notify('បានស្ដារទិន្នន័យគំរូពេញលេញឡើងវិញ!');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        'ប្រយ័ត្ន៖ តើលោកអ្នកពិតជាចង់សម្អាតទិន្នន័យគំរូទាំងអស់ ដើម្បីចាប់ផ្តើមប្រើប្រាស់ផ្ទាល់ខ្លួនថ្មីពីសូន្យមែនទេ?'
      )
    ) {
      return;
    }
    try {
      await apiRequest('/api/system/clear-all', { method: 'POST' });
      notify('បានសម្អាតទិន្នន័យទាំងអស់! ឥឡូវនេះលោកអ្នកអាចបង្កើតកម្មវិធីថ្មីផ្ទាល់ខ្លួនបានហើយ។');
      await onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            របាយការណ៍វិភាគ ស្ថិតិ & ការបម្រុងទុកទិន្នន័យប្រព័ន្ធ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            វិភាគប្រភពចំណងដៃ ចំណាត់ថ្នាក់ភ្ញៀវ VIP កំណត់ហេតុសុវត្ថិភាព និងរក្សាទុកទិន្នន័យការពារបាត់បង់ ១០០%
          </p>
        </div>

        {activeEvent && (
          <button
            type="button"
            onClick={onOpenPrintBook}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-extrabold cursor-pointer"
          >
            <Printer className="w-4 h-4" /> បោះពុម្ពសៀវភៅរបាយការណ៍ PDF
          </button>
        )}
      </div>

      {/* Analytics Grid for Active Event */}
      {activeEvent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Payment Method Breakdown */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">ចំណែកតាមវិធីបង់ប្រាក់</h3>
              <span className="text-xs font-bold text-amber-700">
                មធ្យម៖ {formatUSD(analytics.avgPerGuest)}/ភ្ញៀវ
              </span>
            </div>
            <div className="space-y-3">
              {analytics.byMethod.map(([mId, val], idx) => {
                const pct = analytics.totalEq > 0 ? Math.round((val / analytics.totalEq) * 100) : 0;
                return (
                  <div key={mId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{PAYMENT_METHODS[mId]?.km || mId}</span>
                      <span className="tabular-nums">
                        {formatUSD(val)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Guest Group & Side Breakdown */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">ចំណែកតាមក្រុមភ្ញៀវ & ខាង</h3>
            <div className="space-y-2.5">
              {analytics.byGroup.map(([gId, val], idx) => {
                const pct = analytics.totalEq > 0 ? Math.round((val / analytics.totalEq) * 100) : 0;
                return (
                  <div key={gId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{GUEST_GROUPS[gId]?.km || gId}</span>
                      <span className="tabular-nums">{formatUSD(val)} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CHART_COLORS[(idx + 2) % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              {analytics.bySide.map(([sId, val]) => (
                <div key={sId} className="rounded-xl bg-slate-50 p-2 border border-slate-200/70">
                  <div className="text-[10px] font-bold text-slate-500">{SIDES[sId]?.km || sId}</div>
                  <div className="text-xs font-black text-slate-900 tabular-nums mt-0.5">
                    {formatUSD(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Top Contributors VIP Leaderboard */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              ភ្ញៀវចងដៃខ្ពស់បំផុតក្នុងកម្មវិធីនេះ
            </h3>
            <div className="divide-y divide-slate-100">
              {analytics.topContributors.map((c, idx) => (
                <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-orange-200 text-orange-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {c.guest_title} {c.guest_name}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-extrabold text-emerald-700 tabular-nums">
                    {formatUSD(c.usdEquiv)}
                    {Number(c.amount_khr) > 0 && Number(c.amount_usd) === 0 && (
                      <span className="block text-[10px] text-sky-700">{formatKHR(c.amount_khr)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Database Backup, Restore & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup & System Controls */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              គ្រប់គ្រងទិន្នន័យ & បម្រុងទុកសុវត្ថិភាព (Backup & Restore)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            រាល់ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកក្នុងមូលដ្ឋានទិន្នន័យ SQLite ដោយស្វ័យប្រវត្តិ។ លោកអ្នកក៏អាចទាញយកឯកសារ JSON Backup ទុកក្នុងទូរស័ព្ទ ឬកុំព្យូទ័រសម្រាប់រក្សាទុករាប់សិបឆ្នាំផងដែរ!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ទាញយក Full Backup (.JSON)
            </button>

            <input
              ref={backupInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              ស្ដារទិន្នន័យពីឯកសារ Backup
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              ស្ដារទិន្នន័យគំរូដើមឡើងវិញ
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              សម្អាតទាំងអស់ចាប់ផ្តើមថ្មី
            </button>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              ប្រវត្តិសកម្មភាពប្រព័ន្ធ (Clerk Audit Log)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs flex items-start justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900">{log.summary}</span>
                  <div className="text-[11px] text-slate-500">
                    ដោយ៖ {log.actor} • សកម្មភាព៖ {log.action}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {String(log.created_at || '').slice(5, 16)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
