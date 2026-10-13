import { useState } from 'react';
import { LogOut, MoonStar, SunMedium } from 'lucide-react';

import { buildExport, downloadText, exportFilename, logsToMarkdown, notesToMarkdown, topicsToMarkdown } from '../lib/exportData';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { modKeyLabel } from '../lib/utils';
import { Button, PageHeader } from '../components/ui';

type ExportKind = 'json' | 'topics' | 'notes' | 'logs';

const exportMessages: Record<ExportKind, string> = {
  json: 'JSON backup download started.',
  topics: 'Topics download started.',
  notes: 'Classic notes download started.',
  logs: 'Daily log download started.',
};

export function SettingsPage({
  workspace,
  theme,
  onToggleTheme,
  onSignOut,
  onClearDevice,
  reportError,
  notify,
}: {
  workspace: WorkspaceController;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => Promise<void>;
  onClearDevice: () => void;
  reportError: (message: string) => void;
  notify: (message: string) => void;
}) {
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function runExport(kind: ExportKind) {
    setBusy(kind);
    try {
      const data = await workspace.exportSnapshot();
      if (kind === 'json') downloadText(exportFilename('json'), JSON.stringify(buildExport(data), null, 2), 'application/json');
      if (kind === 'topics') downloadText(exportFilename('topics'), topicsToMarkdown(data.topics, data.entries), 'text/markdown');
      if (kind === 'notes') downloadText(exportFilename('notes'), notesToMarkdown(data.notes), 'text/markdown');
      if (kind === 'logs') downloadText(exportFilename('logs'), logsToMarkdown(data.logs), 'text/markdown');
      notify(exportMessages[kind]);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  }

  function exportButton(kind: ExportKind, label: string, primary = false) {
    return (
      <Button variant={primary ? 'primary' : 'default'} onClick={() => void runExport(kind)} disabled={busy !== null}>
        {busy === kind ? 'Preparing…' : label}
      </Button>
    );
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await onSignOut();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not sign out.');
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your account, appearance, and data."
      />

      <section className="surface p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Device data</h3>
        <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Remove the saved copy of your workspace from this browser.
        </p>
        <Button className="mt-4" variant="danger" onClick={() => {
          if (!window.confirm('Delete the copy of your data saved in this browser? This does not delete your account.')) return;
          onClearDevice();
        }}>
          Delete data on this device
        </Button>
      </section>

      <section className="surface p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Appearance and account</h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Change the app theme or sign out of your account.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onToggleTheme}>
            {theme === 'light' ? <MoonStar size={16} className="mr-2" /> : <SunMedium size={16} className="mr-2" />}
            Switch to {theme === 'light' ? 'dark' : 'light'} mode
          </Button>
          <Button variant="danger" onClick={() => void signOut()} disabled={signingOut}>
            <LogOut size={16} className="mr-2" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </section>

      <section className="surface p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Keyboard shortcuts</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[
            [`${modKeyLabel} + K`, 'Quick capture from anywhere'],
            ['C', 'Quick capture (when not typing)'],
            ['N', 'Capture a note into a topic'],
            ['T', 'Capture a to-do'],
            ['Enter', 'Send a note in a topic (desktop)'],
            ['Shift + Enter', 'New line in a topic note'],
            [`${modKeyLabel} + Enter`, 'Save the quick capture or note'],
            ['Esc', 'Close a dialog or cancel an edit'],
          ].map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-950">
              <dt className="text-stone-600 dark:text-stone-300">{action}</dt>
              <dd><kbd className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 font-sans text-xs dark:border-stone-700 dark:bg-stone-900">{keys}</kbd></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Export your data</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
          Download a JSON file of your to-dos, topics and their notes, goals, inbox, classic notes, daily logs, and reviews. Topics, classic notes, and daily logs can also be downloaded as Markdown. The export reads the rows in your Supabase project. If it fails, nothing is downloaded and the error stays on screen.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {exportButton('json', 'Download JSON', true)}
          {exportButton('topics', 'Download topics')}
          {exportButton('notes', 'Download classic notes')}
          {exportButton('logs', 'Download daily logs')}
        </div>
      </section>

      <section className="surface p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Back up the database</h3>
        <div className="mt-2 space-y-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          <p>In the Supabase dashboard, open Database → Backups if your plan includes them, or use the SQL editor and Table Editor to export the tables you care about.</p>
          <p>With the Postgres connection string from Project Settings → Database, you can also run <code>pg_dump</code> from your own computer. Store that file somewhere you control.</p>
          <p>To restore, create the tables from the SQL migrations, then import the saved rows into the same account. Do not put the database password or service-role key in this app.</p>
        </div>
      </section>
    </div>
  );
}
