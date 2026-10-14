import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Session } from '@supabase/supabase-js';

import { AuthErrorScreen, AuthLoadingScreen, LoginScreen, SetupScreen } from './components/AuthScreen';
import type { CaptureMode } from './components/QuickCaptureDialog';
import { QuickCaptureDialog } from './components/QuickCaptureDialog';
import { Shell } from './components/Shell';
import { emptyTaskDraft } from './components/TaskForm';
import { Button, Skeleton, Toast } from './components/ui';
import { useWorkspace } from './hooks/useWorkspace';
import { purgeExpiredAccounts } from './lib/db';
import { purgeExpiredCaches } from './lib/localCache';
import { hasSupabaseConfig, requireSupabaseClient } from './lib/supabase';
import type { AppView } from './lib/types';
import { toLocalDateKey } from './lib/date';
import { isOverdue } from './lib/tasks';
import { UNSORTED_ID } from './lib/topics';
import { isTypingTarget } from './lib/utils';
import { ActivityPage } from './pages/ActivityPage';
import { DailyLogPage } from './pages/DailyLogPage';
import { GoalsPage } from './pages/GoalsPage';
import { InboxPage } from './pages/InboxPage';
import { NotesPage } from './pages/NotesPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { TodayPage } from './pages/TodayPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { TopicsPage } from './pages/TopicsPage';

const VIEWS: AppView[] = ['tasks', 'notes', 'activity', 'today', 'inbox', 'daily-log', 'goals', 'reviews', 'old-notes', 'settings'];
const NOTE_VIEWS: AppView[] = ['notes', 'topic', 'activity', 'old-notes'];

type Route = { view: AppView; topicId: string | null };

function routeFromHash(): Route {
  if (typeof window === 'undefined') return { view: 'tasks', topicId: null };
  const path = window.location.hash.replace(/^#\/?/, '');
  const topicMatch = /^topic\/(.+)$/.exec(path);
  if (topicMatch) {
    try {
      return { view: 'topic', topicId: decodeURIComponent(topicMatch[1]) };
    } catch {
      return { view: 'notes', topicId: null };
    }
  }
  return { view: VIEWS.find((view) => view === path) ?? 'tasks', topicId: null };
}

function hashFor(view: AppView, topicId: string | null) {
  return view === 'topic' && topicId ? `/topic/${encodeURIComponent(topicId)}` : `/${view}`;
}

function captureModeFor(view: AppView): CaptureMode {
  if (NOTE_VIEWS.includes(view)) return 'note';
  if (view === 'inbox') return 'inbox';
  return 'todo';
}

function readTheme(): 'light' | 'dark' {
  if (typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem('myspace-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readCollapsed() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('myspace-sidebar') === 'collapsed';
}

function accountName(session: Session) {
  const displayName = (session.user.user_metadata as { display_name?: unknown } | undefined)?.display_name;
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim();
  return session.user.email?.split('@')[0] ?? '';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRetry, setAuthRetry] = useState(0);

  useEffect(() => {
    purgeExpiredCaches();
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || session) return undefined;
    void purgeExpiredAccounts();
    return undefined;
  }, [session, authRetry]);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;
    let active = true;
    const client = requireSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
      setAuthError(null);
    });

    void client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) throw sessionError;
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : 'Could not check your sign-in.');
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authRetry]);

  if (!hasSupabaseConfig) return <SetupScreen />;
  if (authError) {
    return <AuthErrorScreen message={authError} onRetry={() => {
      setAuthError(null);
      setAuthReady(false);
      setAuthRetry((current) => current + 1);
    }} />;
  }
  if (!authReady) return <AuthLoadingScreen />;
  if (!session) {
    return <LoginScreen
      onSignIn={async (email, password) => {
        const { error } = await requireSupabaseClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
      }}
      onSignUp={async (email, password) => {
        const { data, error } = await requireSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: import.meta.env.VITE_SITE_URL || 'https://daybook-notes.vercel.app/',
          },
        });
        if (error) throw error;
        return !data.session;
      }}
    />;
  }

  return <WorkspaceApp session={session} onSignOut={async () => {
    const { error } = await requireSupabaseClient().auth.signOut();
    if (error) throw error;
  }} />;
}

function WorkspaceApp({ session, onSignOut }: { session: Session; onSignOut: () => Promise<void> }) {
  const workspace = useWorkspace(session.user.id, session.user.email, accountName(session), session.user.created_at);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [logDate, setLogDate] = useState(toLocalDateKey());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('todo');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = !workspace.loading && !workspace.loadError;
  const { view, topicId } = route;

  const closeCapture = useCallback(() => setCaptureOpen(false), []);
  const openCapture = useCallback((mode?: CaptureMode) => {
    if (!ready) return;
    setCaptureMode(mode ?? captureModeFor(view));
    setCaptureOpen(true);
  }, [ready, view]);
  const notify = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);
  const reportError = useCallback((message: string) => {
    setNotice(null);
    setError(message);
  }, []);

  const navigate = useCallback((next: AppView, nextTopicId: string | null = null) => {
    const target = hashFor(next, nextTopicId);
    if (window.location.hash.replace(/^#/, '') === target) {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0 });
      return;
    }
    window.location.hash = target;
  }, []);
  const setView = useCallback((next: AppView) => navigate(next), [navigate]);
  const openTopic = useCallback((id: string) => navigate('topic', id), [navigate]);

  useEffect(() => {
    function onHashChange() {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0 });
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0a09' : '#f5f5f4');
    localStorage.setItem('myspace-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('myspace-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hasSupabaseConfig || !ready || captureOpen) return undefined;

    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCapture();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const mode: CaptureMode | undefined = key === 'n' ? 'note' : key === 't' ? 'todo' : undefined;
      if (key === 'c' || mode) {
        event.preventDefault();
        openCapture(mode);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureOpen, openCapture, ready]);

  const today = toLocalDateKey();
  const badges = useMemo<Partial<Record<AppView, number>>>(() => ({
    notes: workspace.entries.filter((entry) => entry.topic_id === null).length,
    inbox: workspace.inbox.filter((item) => !item.is_archived).length,
    tasks: workspace.tasks.filter((task) => isOverdue(task, today)).length,
  }), [today, workspace.entries, workspace.inbox, workspace.tasks]);

  const captureTopicId = view === 'topic' && topicId && topicId !== UNSORTED_ID ? topicId : null;

  return (
    <Shell
      view={view}
      collapsed={collapsed}
      badges={ready ? badges : {}}
      onView={setView}
      onToggleCollapsed={() => setCollapsed((current) => !current)}
      onCapture={() => openCapture()}
    >
      {workspace.loading ? <Skeleton /> : workspace.loadError ? (
        <div className="surface max-w-xl p-5">
          <h2 className="text-xl font-semibold">Could not load your data</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{workspace.loadError}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => void workspace.refresh().catch((loadError: unknown) => reportError(loadError instanceof Error ? loadError.message : 'Could not reload.'))}>Try again</Button>
          </div>
        </div>
      ) : (
        <>
          {view === 'tasks' && <TasksPage workspace={workspace} notify={notify} reportError={reportError} />}
          {view === 'notes' && <TopicsPage workspace={workspace} notify={notify} onOpenTopic={openTopic} />}
          {view === 'topic' && topicId && <TopicDetailPage key={topicId} workspace={workspace} topicId={topicId} notify={notify} reportError={reportError} onBack={() => setView('notes')} />}
          {view === 'activity' && (
            <ActivityPage
              workspace={workspace}
              onOpenTopic={openTopic}
              onOpenTasks={() => setView('tasks')}
              onOpenLog={(date) => { setLogDate(date); setView('daily-log'); }}
            />
          )}
          {view === 'today' && <TodayPage workspace={workspace} onOpenLog={() => { setLogDate(toLocalDateKey()); setView('daily-log'); }} onCapture={() => openCapture()} onOpenTasks={() => setView('tasks')} notify={notify} reportError={reportError} />}
          {view === 'inbox' && <InboxPage workspace={workspace} notify={notify} reportError={reportError} onOpenCapture={() => openCapture('inbox')} />}
          {view === 'daily-log' && <DailyLogPage workspace={workspace} date={logDate} onDate={setLogDate} />}
          {view === 'goals' && <GoalsPage workspace={workspace} notify={notify} reportError={reportError} />}
          {view === 'reviews' && <ReviewsPage workspace={workspace} />}
          {view === 'old-notes' && <NotesPage workspace={workspace} notify={notify} reportError={reportError} />}
          {view === 'settings' && (
            <SettingsPage
              workspace={workspace}
              theme={theme}
              onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              onSignOut={onSignOut}
              onClearDevice={() => {
                workspace.clearDeviceCache();
                notify('Deleted the copy saved in this browser.');
              }}
              notify={notify}
              reportError={reportError}
            />
          )}
        </>
      )}

      {(notice || error) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
          {error && <Toast tone="error" onClose={() => setError(null)}>{error}</Toast>}
          {notice && <Toast tone="success" onClose={() => setNotice(null)}>{notice}</Toast>}
        </div>
      )}

      <QuickCaptureDialog
        open={captureOpen}
        defaultMode={captureMode}
        defaultTopicId={captureTopicId}
        topics={workspace.topics}
        onClose={closeCapture}
        onSaveTask={async ({ title, detail, dueToday, high }) => {
          await workspace.createTask({
            ...emptyTaskDraft,
            title,
            description: detail,
            due_date: dueToday ? toLocalDateKey() : '',
            priority: high ? 'high' : 'normal',
          });
          notify(dueToday ? 'To-do added for today.' : 'To-do added.');
        }}
        onSaveNote={async ({ topicId: chosenTopicId, newTopicTitle, kind, content, items }) => {
          let targetId = chosenTopicId;
          if (newTopicTitle) targetId = (await workspace.createTopic({ title: newTopicTitle.trim() })).id;
          await workspace.createEntry({ topic_id: targetId, kind, content, items });
          const topicTitle = workspace.topics.find((topic) => topic.id === targetId)?.title ?? newTopicTitle?.trim();
          notify(targetId ? `Added to ${topicTitle ?? 'your topic'}.` : 'Saved to Notes › Unsorted. File it under a topic later.');
          return targetId;
        }}
        onSaveInbox={async (input) => {
          await workspace.createInboxItem(input);
          notify('Saved to your inbox.');
        }}
      />
    </Shell>
  );
}
