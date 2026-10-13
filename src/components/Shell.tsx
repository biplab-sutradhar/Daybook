import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpenText, ClipboardList, Ellipsis, History, Inbox, Notebook, NotebookPen, PanelLeft, Plus, Settings2, Sparkles, Target, TrendingUp, X } from 'lucide-react';

import { APP_NAME } from '../lib/constants';
import type { AppView } from '../lib/types';
import { cn, modKeyLabel } from '../lib/utils';
import { Button, IconButton } from './ui';

type NavItem = { id: AppView; label: string; icon: LucideIcon };

const primaryNav: NavItem[] = [
  { id: 'tasks', label: 'To-do', icon: ClipboardList },
  { id: 'notes', label: 'Notes', icon: BookOpenText },
  { id: 'activity', label: 'Activity', icon: History },
];

const secondaryNav: NavItem[] = [
  { id: 'today', label: 'Today', icon: Sparkles },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'daily-log', label: 'Daily Log', icon: NotebookPen },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'reviews', label: 'Reviews', icon: TrendingUp },
  { id: 'old-notes', label: 'Classic notes', icon: Notebook },
];

const settingsItem: NavItem = { id: 'settings', label: 'Settings', icon: Settings2 };
const byId = new Map([...primaryNav, ...secondaryNav, settingsItem].map((item) => [item.id, item]));
const mobileTabs: AppView[] = ['tasks', 'notes'];
const mobileTabsAfterCapture: AppView[] = ['activity'];
const moreViews: AppView[] = [...secondaryNav.map((item) => item.id), 'settings'];

function Count({ value, className }: { value?: number; className?: string }) {
  if (!value) return null;
  return (
    <span className={cn('min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-[11px] leading-5 font-semibold text-white', className)}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

export function Shell({
  view,
  collapsed,
  badges,
  onView,
  onToggleCollapsed,
  onCapture,
  children,
}: {
  view: AppView;
  collapsed: boolean;
  badges: Partial<Record<AppView, number>>;
  onView: (view: AppView) => void;
  onToggleCollapsed: () => void;
  onCapture: () => void;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBadge = moreViews.reduce((total, id) => total + (badges[id] ?? 0), 0);
  const active: AppView = view === 'topic' ? 'notes' : view;
  const inMore = moreViews.includes(active);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  function go(next: AppView) {
    setMoreOpen(false);
    onView(next);
  }

  function renderTab(id: AppView) {
    const item = byId.get(id);
    if (!item) return null;
    const Icon = item.icon;
    const current = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => go(id)}
        aria-current={current ? 'page' : undefined}
        className={cn('relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium', current ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400')}
      >
        <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition', current && 'bg-stone-200 dark:bg-stone-800')}>
          <Icon size={18} />
          <Count value={badges[id]} className="absolute -top-1 -right-1 min-w-4 px-1 text-[10px] leading-4" />
        </span>
        {item.label}
      </button>
    );
  }

  function renderSidebarItem({ id, label, icon: Icon }: NavItem, primary: boolean) {
    const current = active === id;
    return (
      <button
        key={id}
        type="button"
        title={label}
        aria-current={current ? 'page' : undefined}
        onClick={() => onView(id)}
        className={cn(
          'relative flex w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors',
          primary ? 'min-h-11 font-medium' : 'min-h-9',
          current
            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80 dark:bg-stone-800 dark:text-stone-50 dark:ring-stone-700'
            : primary
              ? 'text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800'
              : 'text-stone-500 hover:bg-stone-200/70 dark:text-stone-400 dark:hover:bg-stone-800',
          collapsed && 'justify-center px-0',
        )}
      >
        <Icon size={primary ? 18 : 16} />
        {!collapsed && <span className="flex-1">{label}</span>}
        {collapsed
          ? badges[id] ? <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-rose-600" aria-label={`${badges[id]} need attention`} /> : null
          : <Count value={badges[id]} />}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="flex min-h-screen w-full">
        <aside className={cn('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-stone-200/70 bg-stone-50/80 p-3 transition-[width] md:flex dark:border-stone-800 dark:bg-stone-950', collapsed ? 'w-20' : 'w-64')}>
          <div className={cn('mb-4 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
            {!collapsed && (
              <div className="pl-1">
                <p className="text-[11px] tracking-[0.18em] text-stone-500 uppercase">Workspace</p>
                <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
              </div>
            )}
            <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggleCollapsed}>
              <PanelLeft size={18} />
            </IconButton>
          </div>

          <Button variant="primary" className={cn('mb-4 min-h-11', collapsed ? 'px-0' : 'justify-between')} onClick={onCapture} aria-label="Quick capture" title={`Quick capture (${modKeyLabel}+K)`}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              {!collapsed && 'Quick Capture'}
            </span>
            {!collapsed && <kbd className="rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[11px] text-white/80 dark:bg-stone-900/10 dark:text-stone-600">{modKeyLabel} K</kbd>}
          </Button>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Primary">
            {primaryNav.map((item) => renderSidebarItem(item, true))}
            {collapsed ? (
              <div className="mx-3 my-3 border-t border-stone-200 dark:border-stone-800" />
            ) : (
              <p className="px-3 pt-5 pb-1 text-[11px] tracking-[0.18em] text-stone-400 uppercase">More</p>
            )}
            {secondaryNav.map((item) => renderSidebarItem(item, false))}
          </nav>

          <div className="mt-auto space-y-2 pt-4">
            <button
              type="button"
              title="Settings"
              onClick={() => onView('settings')}
              aria-current={active === 'settings' ? 'page' : undefined}
              className={cn('flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors', active === 'settings' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80 dark:bg-stone-800 dark:text-stone-50 dark:ring-stone-700' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800', collapsed && 'justify-center px-0')}
            >
              <Settings2 size={18} />
              {!collapsed && 'Settings'}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-stone-200/70 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:hidden dark:border-stone-800">
            <h1 className="text-lg font-semibold tracking-tight">{APP_NAME}</h1>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-10 md:py-10 md:pb-12">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/70 bg-white/95 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden dark:border-stone-800 dark:bg-stone-950/95"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-center">
          {mobileTabs.map(renderTab)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => { setMoreOpen(false); onCapture(); }}
              aria-label="Quick capture"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg shadow-stone-900/20 active:scale-95 dark:bg-stone-100 dark:text-stone-900"
            >
              <Plus size={22} />
            </button>
          </div>
          {mobileTabsAfterCapture.map(renderTab)}
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={cn('relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium', inMore || moreOpen ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400')}
          >
            <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition', (inMore || moreOpen) && 'bg-stone-200 dark:bg-stone-800')}>
              <Ellipsis size={18} />
              <Count value={moreBadge} className="absolute -top-1 -right-1 min-w-4 px-1 text-[10px] leading-4" />
            </span>
            <span className="max-w-16 truncate">{inMore ? byId.get(active)?.label : 'More'}</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-20 bg-stone-950/30 md:hidden" role="presentation" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            className="animate-sheet-in motion-reduce:animate-none absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-stone-200 bg-white px-3 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] dark:border-stone-800 dark:bg-stone-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-sm font-semibold">More</p>
              <IconButton label="Close" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreViews.map((id) => {
                const item = byId.get(id);
                if (!item) return null;
                const Icon = item.icon;
                const current = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => go(id)}
                    aria-current={current ? 'page' : undefined}
                    className={cn('relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-1 text-center text-sm font-medium', current ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200')}
                  >
                    <Icon size={20} />
                    {item.label}
                    <Count value={badges[id]} className="absolute top-2 right-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
