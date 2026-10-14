type DbError = {
  message?: string;
  code?: string;
};

export function formatDbError(error: DbError | null | undefined, fallback: string) {
  const message = error?.message?.trim() || fallback;
  const code = error?.code ?? '';

  if (/DEMO_FULL/i.test(message)) {
    return 'New accounts are temporarily unavailable. Please try again later.';
  }

  if (/DEMO_QUOTA/i.test(message)) {
    return 'This workspace has reached its storage limit. Remove some content and try again.';
  }

  if (/jwt|expired|not authenticated|invalid claim/i.test(message)) {
    return 'Your session expired. Sign in again.';
  }

  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Daybook cannot access this data. In the Supabase SQL editor, run migrations 001–004 followed by 006_portfolio_demo.sql, and make sure 006 completes successfully. Do not run 005_lock_to_login.sql. If this persists, check that the site’s VITE_SUPABASE_URL points to the same project.';
  }

  if (code === '23505' || /duplicate key/i.test(message)) {
    return 'A record for that date or period already exists.';
  }

  if (/auth\.users|user_id_fkey|profiles_id_fkey/i.test(message)) {
    return 'That account is no longer available. Please create a new account to continue.';
  }

  if (code === '23503' || /foreign key/i.test(message)) {
    return 'That linked record could not be found.';
  }

  if (/only three top priorities/i.test(message)) {
    return 'You can keep only three top priorities. Clear one before adding another.';
  }

  if (/goal must belong/i.test(message)) {
    return 'Choose a goal from your own workspace.';
  }

  if (/user_id cannot be changed/i.test(message)) {
    return 'Ownership cannot be changed.';
  }

  if (code === '23514' || /check constraint/i.test(message)) {
    return 'Some of those values are not allowed.';
  }

  if (code === 'PGRST116' || /0 rows/i.test(message)) {
    return 'That record was not found, or it is not available to this account.';
  }

  if (/topic must belong/i.test(message)) {
    return 'Choose a topic from your own workspace.';
  }

  if (/topic/i.test(message) && /could not find the table|schema cache|does not exist/i.test(message)) {
    return 'The Notes topics are not set up yet. In the Supabase SQL editor, run supabase/migrations/004_topics.sql, then reload.';
  }

  if (/could not find the table|schema cache|does not exist|relation .* does not exist/i.test(message)) {
    return 'The database tables are missing. Run supabase/migrations/001_initial_schema.sql and then 002_integrity.sql in the Supabase SQL editor.';
  }

  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'Could not reach Supabase. Check your connection and the project URL.';
  }

  return message;
}
