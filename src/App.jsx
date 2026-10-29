import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarHeart,
  Zap,
  BookOpen,
  Users,
  QrCode,
  Wallet,
  Calculator,
  HeartHandshake,
  BarChart3,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { EVENT_TYPES, formatUSD, formatKHR } from './constants/catalog';
import { apiRequest, getStorageMode } from './utils/api';

import OverviewDashboard from './components/OverviewDashboard';
import EventsManager from './components/EventsManager';
import ReceptionDesk from './components/ReceptionDesk';
import LedgerBook from './components/LedgerBook';
import InvitationsAndTables from './components/InvitationsAndTables';
import DigitalInvitationPortal from './components/DigitalInvitationPortal';
import ExpensesTracker from './components/ExpensesTracker';
import CashReconciliation from './components/CashReconciliation';
import ReciprocityLedger from './components/ReciprocityLedger';
import ReportsAndSettings from './components/ReportsAndSettings';
import ReceiptModal from './components/ReceiptModal';
import PrintBookModal from './components/PrintBookModal';

const NAV_ITEMS = [
  { id: 'overview', km: 'ផ្ទាំងគ្រប់គ្រងរួម', sub: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'desk', km: 'តុទទួលភ្ញៀវកត់ត្រារហ័ស', sub: 'Fast Reception Desk', icon: Zap, highlight: true },
  { id: 'ledger', km: 'សៀវភៅបញ្ជីចំណងដៃ', sub: 'Full Chongdai Book', icon: BookOpen },
  { id: 'events', km: 'កម្មវិធីទាំងអស់', sub: 'All Ceremony Types', icon: CalendarHeart },
  { id: 'invitations', km: 'ភ្ញៀវអញ្ជើញ & រៀបចំតុ', sub: 'RSVP & Table Map', icon: Users },
  { id: 'einvite', km: 'ធៀបឌីជីថល & KHQR', sub: 'Online E-Invitation', icon: QrCode },
  { id: 'expenses', km: 'ចំណាយ & គណនេយ្យ', sub: 'Expenses & Surplus', icon: Wallet },
  { id: 'cashcount', km: 'រាប់លុយហិប & ផ្ទៀងផ្ទាត់', sub: 'Cash Box Counter', icon: Calculator },
  { id: 'reciprocity', km: 'ចំណងដៃទៅវិញទៅមក', sub: 'Reciprocity History', icon: HeartHandshake },
  { id: 'reports', km: 'របាយការណ៍ & បម្រុងទុក', sub: 'Analytics & Backup', icon: BarChart3 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bootstrap, setBootstrap] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const [presetCreateType, setPresetCreateType] = useState(null);
  const [prefillGuest, setPrefillGuest] = useState(null);

  const [receiptModal, setReceiptModal] = useState(null); // { contribution, event }
  const [printBookOpen, setPrintBookOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3400 ? null : prev));
    }, 3500);
  }, []);

  const fetchAll = useCallback(
    async (preferredEventId = null) => {
      try {
        const boot = await apiRequest('/api/bootstrap');
        setBootstrap(boot);

        const evList = boot.events || [];
        let targetId = preferredEventId ?? activeEventId;
        if (!targetId || !evList.some((e) => e.id === targetId)) {
          targetId = evList[0]?.id || null;
        }
        setActiveEventId(targetId);

        if (targetId) {
          const ws = await apiRequest(`/api/events/${targetId}/workspace`);
          setWorkspace(ws);
        } else {
          setWorkspace(null);
        }
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [activeEventId, notify]
  );

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEvent = async (id) => {
    const numId = Number(id);
    setActiveEventId(numId);
    try {
      const ws = await apiRequest(`/api/events/${numId}/workspace`);
      setWorkspace(ws);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleOpenNewEventWithType = (typeId) => {
    setPresetCreateType(typeId);
    setActiveTab('events');
  };

  const handleOpenDeskForEvent = async (eventId) => {
    await handleSelectEvent(eventId);
    setActiveTab('desk');
  };

  const handleRecordChongdaiForInvite = (inv) => {
    setPrefillGuest(inv);
    setActiveTab('desk');
  };

  const events = bootstrap?.events || [];
  const activeEvent =
    workspace?.event || events.find((e) => e.id === activeEventId) || null;
  const isModalPrinting = Boolean(receiptModal || printBookOpen);

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] text-slate-900">
      {/* Main App Shell (Hidden during modal print so receipts/books print cleanly!) */}
      <div
        className={`flex-1 flex min-w-0 ${
          isModalPrinting ? 'app-shell-when-printing-modal' : ''
        }`}
      >
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col khmer-royal-bg text-white border-r border-slate-800 sticky top-0 h-screen">
          {/* Brand Logo */}
          <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="font-moul text-base text-amber-300 tracking-wide">
                កត់ចំណងដៃ Pro
              </div>
              <div className="text-[11px] text-slate-300">
                ប្រព័ន្ធកត់ត្រាចំណងដៃគ្រប់កម្មវិធី
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                      : item.highlight
                      ? 'bg-white/8 hover:bg-white/15 text-amber-200 border border-amber-400/25'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-slate-950' : 'text-amber-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{item.km}</div>
                    <div
                      className={`text-[10px] truncate ${
                        active ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </div>
                  {item.id === 'ledger' &&
                    activeEvent?.stats?.pending_online_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                        {activeEvent.stats.pending_online_count}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Summary */}
          <div className="p-4 border-t border-white/10 bg-slate-950/40 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span>កម្មវិធីសរុបក្នុងប្រព័ន្ធ</span>
              <strong className="text-white">{events.length} កម្មវិធី</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>សរុបចំណងដៃរួម</span>
              <strong className="text-amber-300 tabular-nums">
                {formatUSD(bootstrap?.globalTotals?.combined_usd)}
              </strong>
            </div>
            <div className="pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                {getStorageMode() === 'server'
                  ? 'SQLite Server បានភ្ជាប់រួចរាល់'
                  : 'រក្សាទុកក្នុងឧបករណ៍ផ្ទាល់ (Offline/Vercel Ready)'}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] khmer-royal-bg text-white flex flex-col h-full z-10">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <span className="font-moul text-amber-300 text-sm">កត់ចំណងដៃ Pro</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-extrabold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">{item.km}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Right Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sticky Top Bar */}
          <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Active Event Global Selector */}
              {events.length > 0 ? (
                <div className="relative flex items-center gap-2 min-w-0">
                  <span className="hidden sm:inline text-xs font-bold text-slate-500 shrink-0">
                    កម្មវិធី៖
                  </span>
                  <div className="relative">
                    <select
                      value={activeEventId || ''}
                      onChange={(e) => handleSelectEvent(e.target.value)}
                      className="appearance-none rounded-xl bg-amber-50/90 hover:bg-amber-100/80 border border-amber-300 pl-3 pr-8 py-1.5 text-xs sm:text-sm font-extrabold text-amber-950 max-w-[230px] sm:max-w-md truncate focus:outline-none cursor-pointer"
                    >
                      {events.map((ev) => {
                        const t = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
                        return (
                          <option key={ev.id} value={ev.id}>
                            {t.emoji} {ev.title}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-4 h-4 text-amber-800 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-500">
                  មិនទាន់មានកម្មវិធីត្រូវបានបង្កើត
                </span>
              )}
            </div>

            {/* Right Quick Totals & Fast Desk Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              {activeEvent && (
                <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatUSD(activeEvent.stats?.sum_usd)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold text-sky-700 tabular-nums">
                    {formatKHR(activeEvent.stats?.sum_khr)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-black text-amber-900 tabular-nums">
                    សរុប ≈ {formatUSD(activeEvent.stats?.combined_usd)}
                  </span>
                </div>
              )}

              {activeTab !== 'desk' && activeEvent && (
                <button
                  type="button"
                  onClick={() => setActiveTab('desk')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>កត់ត្រារហ័ស</span>
                </button>
              )}
            </div>
          </header>

          {/* Main Workspace Body */}
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto" />
                <div className="text-sm font-bold text-slate-600">
                  កំពុងផ្ទុកប្រព័ន្ធ កត់ចំណងដៃ Pro...
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewDashboard
                    bootstrap={bootstrap}
                    activeEvent={activeEvent}
                    activeWorkspace={workspace}
                    onSelectEvent={handleSelectEvent}
                    onNavigate={setActiveTab}
                    onOpenNewEventWithType={handleOpenNewEventWithType}
                    onViewReceipt={(contribution, event) =>
                      setReceiptModal({ contribution, event })
                    }
                    onOpenPrintBook={() => setPrintBookOpen(true)}
                  />
                )}

                {activeTab === 'events' && (
                  <EventsManager
                    events={events}
                    activeEventId={activeEventId}
                    presetCreateType={presetCreateType}
                    onClearPresetType={() => setPresetCreateType(null)}
                    onSelectEvent={handleSelectEvent}
                    onOpenDeskForEvent={handleOpenDeskForEvent}
                    onRefresh={() => fetchAll(activeEventId)}
                    notify={notify}
                  />
                )}

                {activeTab === 'desk' && (
                  <ReceptionDesk
                    activeEvent={activeEvent}
                    workspace={workspace}
                    reciprocityDirectory={bootstrap?.reciprocityDirectory || []}
                    prefillGuest={prefillGuest}
                    onClearPrefill={() => setPrefillGuest(null)}
                    onRefresh={() => fetchAll(activeEventId)}
                    onViewReceipt={(contribution, event) =>
                      setReceiptModal({ contribution, event })
                    }
                    notify={notify}
                  />
                )}

                {activeTab === 'ledger' && (
                  <LedgerBook
                    activeEvent={activeEvent}
                    workspace={workspace}
                    onNavigate={setActiveTab}
                    onRefresh={() => fetchAll(activeEventId)}
                    onViewReceipt={(contribution, event) =>
                      setReceiptModal({ contribution, event })
                    }
                    onOpenPrintBook={() => setPrintBookOpen(true)}
                    notify={notify}
                  />
                )}

                {activeTab === 'invitations' && (
                  <InvitationsAndTables
                    activeEvent={activeEvent}
                    workspace={workspace}
                    onRecordChongdaiForInvite={handleRecordChongdaiForInvite}
                    onRefresh={() => fetchAll(activeEventId)}
                    notify={notify}
                  />
                )}

                {activeTab === 'einvite' && (
                  <DigitalInvitationPortal
                    activeEvent={activeEvent}
                    onRefresh={() => fetchAll(activeEventId)}
                    onViewReceipt={(contribution, event) =>
                      setReceiptModal({ contribution, event })
                    }
                    notify={notify}
                  />
                )}

                {activeTab === 'expenses' && (
                  <ExpensesTracker
                    activeEvent={activeEvent}
                    workspace={workspace}
                    onRefresh={() => fetchAll(activeEventId)}
                    notify={notify}
                  />
                )}

                {activeTab === 'cashcount' && (
                  <CashReconciliation
                    activeEvent={activeEvent}
                    workspace={workspace}
                    onRefresh={() => fetchAll(activeEventId)}
                    notify={notify}
                  />
                )}

                {activeTab === 'reciprocity' && (
                  <ReciprocityLedger
                    outgoingGifts={bootstrap?.outgoingGifts || []}
                    reciprocityDirectory={bootstrap?.reciprocityDirectory || []}
                    onRefresh={() => fetchAll(activeEventId)}
                    notify={notify}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsAndSettings
                    activeEvent={activeEvent}
                    workspace={workspace}
                    bootstrap={bootstrap}
                    onOpenPrintBook={() => setPrintBookOpen(true)}
                    onRefresh={() => fetchAll()}
                    notify={notify}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Printable Official Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          contribution={receiptModal.contribution}
          event={receiptModal.event}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {/* Printable Official Khmer Chongdai Ledger Book Modal */}
      {printBookOpen && activeEvent && (
        <PrintBookModal
          event={activeEvent}
          contributions={workspace?.contributions || []}
          onClose={() => setPrintBookOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 max-w-sm animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-rose-950 text-white border-rose-700'
                : 'bg-slate-900 text-amber-300 border-amber-500/50'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
