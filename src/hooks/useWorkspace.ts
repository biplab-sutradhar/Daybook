import { useCallback, useEffect, useRef, useState } from 'react';

import * as db from '../lib/db';
import { expiresAtFrom } from '../lib/demo';
import { clearUserCache, purgeExpiredCaches, readCache, writeCache } from '../lib/localCache';
import { canMarkTopPriority, nextStatus } from '../lib/tasks';
import { canTransitionTaskStatus, ensurePriority, validateGoalInput, validateNoteInput, validateTaskInput } from '../lib/validation';
import { removeById, replaceById } from '../lib/utils';
import { normalizeTags } from '../lib/notes';
import { entryText, validateEntry } from '../lib/topics';
import type {
  DailyLog,
  EntryInput,
  EntryPatch,
  Goal,
  GoalInput,
  GoalPatch,
  InboxInput,
  InboxItem,
  InboxPatch,
  Note,
  NoteInput,
  NotePatch,
  Profile,
  ReviewDraft,
  ReviewEntry,
  Task,
  TaskInput,
  TaskPatch,
  TaskStatus,
  Topic,
  TopicEntry,
  TopicInput,
  TopicPatch,
} from '../lib/types';

export type WorkspaceController = ReturnType<typeof useWorkspace>;

function upsertLog(logs: DailyLog[], saved: DailyLog) {
  return [saved, ...logs.filter((log) => log.entry_date !== saved.entry_date)].sort((left, right) => right.entry_date.localeCompare(left.entry_date));
}

function upsertReview(reviews: ReviewEntry[], saved: ReviewEntry) {
  return [
    saved,
    ...reviews.filter((entry) => !(entry.review_type === saved.review_type && entry.period_start === saved.period_start && entry.period_end === saved.period_end)),
  ];
}

function readInitialCache(userId: string | null) {
  if (!userId) return null;
  purgeExpiredCaches();
  return readCache(userId);
}

export function useWorkspace(userId: string | null, email: string | undefined, workspaceName: string, signedUpAt?: string) {
  const [seed] = useState(() => readInitialCache(userId));
  const [profile, setProfile] = useState<Profile | null>(seed?.data.profile ?? null);
  const [tasks, setTasks] = useState<Task[]>(seed?.data.tasks ?? []);
  const [goals, setGoals] = useState<Goal[]>(seed?.data.goals ?? []);
  const [notes, setNotes] = useState<Note[]>(seed?.data.notes ?? []);
  const [inbox, setInbox] = useState<InboxItem[]>(seed?.data.inbox ?? []);
  const [logs, setLogs] = useState<DailyLog[]>(seed?.data.logs ?? []);
  const [reviews, setReviews] = useState<ReviewEntry[]>(seed?.data.reviews ?? []);
  const [topics, setTopics] = useState<Topic[]>(seed?.data.topics ?? []);
  const [entries, setEntries] = useState<TopicEntry[]>(seed?.data.entries ?? []);
  const [loading, setLoading] = useState(!seed && Boolean(userId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canCache, setCanCache] = useState(Boolean(seed));
  const signedUpFallback = useRef(signedUpAt ?? new Date().toISOString());
  const expiresAt = expiresAtFrom(signedUpAt ?? signedUpFallback.current);
  const cacheSuspended = useRef(false);
  const tasksRef = useRef(tasks);
  const goalsRef = useRef(goals);
  const topicsRef = useRef(topics);
  const entriesRef = useRef(entries);
  tasksRef.current = tasks;
  goalsRef.current = goals;
  topicsRef.current = topics;
  entriesRef.current = entries;

  const applyData = useCallback((data: db.WorkspaceData) => {
    setProfile(data.profile);
    setTasks(data.tasks);
    setGoals(data.goals);
    setNotes(data.notes);
    setInbox(data.inbox);
    setLogs(data.logs);
    setReviews(data.reviews);
    setTopics(data.topics);
    setEntries(data.entries);
    setCanCache(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoadError(null);
    const data = await db.fetchWorkspace();
    const nextProfile = await db.ensureProfile(userId, workspaceName, email);
    applyData({ ...data, profile: nextProfile });
  }, [applyData, email, userId, workspaceName]);

  useEffect(() => {
    if (!userId) return undefined;

    let active = true;
    const cached = readCache(userId);
    if (!cached) setLoading(true);
    setLoadError(null);

    void refresh()
      .catch((error: unknown) => {
        if (!active || cached) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load your workspace.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refresh, userId]);

  const snapshot = useCallback((): db.WorkspaceData => ({
    profile, tasks, goals, notes, inbox, logs, reviews, topics, entries,
  }), [entries, goals, inbox, logs, notes, profile, reviews, tasks, topics]);

  const resumeCache = useCallback(() => {
    cacheSuspended.current = false;
  }, []);

  useEffect(() => {
    if (!userId || !canCache || cacheSuspended.current) return;
    writeCache(userId, snapshot(), expiresAt);
  }, [canCache, expiresAt, snapshot, userId]);

  const clearDeviceCache = useCallback(() => {
    if (!userId) return;
    cacheSuspended.current = true;
    clearUserCache(userId);
  }, [userId]);

  function assertGoal(goalId: string | null) {
    if (!goalId || !userId) return;
    const goal = goalsRef.current.find((item) => item.id === goalId && item.user_id === userId);
    if (!goal) throw new Error('Choose a goal from your own workspace.');
  }

  const createTask = useCallback(async (input: TaskInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const validation = validateTaskInput({ ...input, priority: ensurePriority(input.priority) });
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    assertGoal(input.goal_id);
    if (input.is_top_priority && !canMarkTopPriority(tasksRef.current, null)) {
      throw new Error('You can keep only three top priorities. Clear one before adding another.');
    }

    const saved = await db.createTask(userId, { ...input, priority: ensurePriority(input.priority) });
    setTasks((current) => [saved, ...current]);
    return saved;
  }, [resumeCache, userId]);

  const updateTask = useCallback(async (id: string, patch: TaskPatch) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const currentTask = tasksRef.current.find((task) => task.id === id);
    if (!currentTask || currentTask.user_id !== userId) throw new Error('That task was not found in your workspace.');
    if (patch.goal_id !== undefined) assertGoal(patch.goal_id);
    if (patch.status && !canTransitionTaskStatus(currentTask.status, patch.status)) {
      throw new Error('That status change is not allowed.');
    }
    if (patch.is_top_priority && !currentTask.is_top_priority && !canMarkTopPriority(tasksRef.current, id)) {
      throw new Error('You can keep only three top priorities. Clear one before adding another.');
    }

    const saved = await db.updateTask(id, patch);
    setTasks((current) => replaceById(current, saved));
    return saved;
  }, [resumeCache, userId]);

  const setTaskStatus = useCallback(async (task: Task, status?: TaskStatus) => {
    resumeCache();
    const next = status ?? nextStatus(task.status);
    if (!canTransitionTaskStatus(task.status, next)) {
      throw new Error('That status change is not allowed. Reopen a completed task before moving it back to in progress.');
    }
    const previous = task;
    const completedAt = next === 'completed' ? task.completed_at ?? new Date().toISOString() : null;
    setTasks((current) => replaceById(current, { ...task, status: next, completed_at: completedAt }));

    try {
      const saved = await db.updateTask(task.id, { status: next, completed_at: completedAt });
      setTasks((current) => replaceById(current, saved));
    } catch (error) {
      setTasks((current) => replaceById(current, previous));
      throw error;
    }
  }, [resumeCache]);

  const deleteTask = useCallback(async (id: string) => {
    resumeCache();
    const previous = tasksRef.current;
    setTasks((current) => removeById(current, id));
    try {
      await db.deleteTask(id);
    } catch (error) {
      setTasks(previous);
      throw error;
    }
  }, [resumeCache]);

  const createGoal = useCallback(async (input: GoalInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const validation = validateGoalInput(input);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    const saved = await db.createGoal(userId, input);
    setGoals((current) => [saved, ...current]);
    return saved;
  }, [resumeCache, userId]);

  const updateGoal = useCallback(async (id: string, patch: GoalPatch) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const saved = await db.updateGoal(id, patch);
    setGoals((current) => replaceById(current, saved));
    return saved;
  }, [resumeCache, userId]);

  const deleteGoal = useCallback(async (id: string) => {
    resumeCache();
    await db.deleteGoal(id);
    setGoals((current) => removeById(current, id));
    setTasks((current) => current.map((task) => (task.goal_id === id ? { ...task, goal_id: null } : task)));
  }, [resumeCache]);

  const createNote = useCallback(async (input: NoteInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const validation = validateNoteInput(input);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    const saved = await db.createNote(userId, { ...input, tags: normalizeTags(input.tags), title: input.title.trim() });
    setNotes((current) => [saved, ...current]);
    return saved;
  }, [resumeCache, userId]);

  const updateNote = useCallback(async (id: string, patch: NotePatch) => {
    resumeCache();
    const saved = await db.updateNote(id, patch);
    setNotes((current) => replaceById(current, saved).sort((left, right) => right.updated_at.localeCompare(left.updated_at)));
    return saved;
  }, [resumeCache]);

  const deleteNote = useCallback(async (id: string) => {
    resumeCache();
    await db.deleteNote(id);
    setNotes((current) => removeById(current, id));
  }, [resumeCache]);

  const createInboxItem = useCallback(async (input: InboxInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const saved = await db.createInboxItem(userId, input);
    setInbox((current) => [saved, ...current]);
    return saved;
  }, [resumeCache, userId]);

  const updateInboxItem = useCallback(async (id: string, patch: InboxPatch) => {
    resumeCache();
    const saved = await db.updateInboxItem(id, patch);
    setInbox((current) => replaceById(current, saved));
    return saved;
  }, [resumeCache]);

  const deleteInboxItem = useCallback(async (id: string) => {
    resumeCache();
    await db.deleteInboxItem(id);
    setInbox((current) => removeById(current, id));
  }, [resumeCache]);

  const convertInboxToTask = useCallback(async (item: InboxItem) => {
    const task = await createTask({
      title: item.title,
      description: item.content ?? '',
      status: 'todo',
      priority: 'normal',
      due_date: '',
      goal_id: null,
      is_top_priority: false,
    });
    try {
      await updateInboxItem(item.id, { is_archived: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not archive the capture.';
      throw new Error(`${message} The task was still created.`);
    }
    return task;
  }, [createTask, updateInboxItem]);

  const bumpTopic = useCallback((topicId: string | null, at: string) => {
    if (!topicId) return;
    const atTime = new Date(at).getTime();
    setTopics((current) => current.map((topic) => (topic.id === topicId && new Date(topic.last_activity_at).getTime() < atTime ? { ...topic, last_activity_at: at } : topic)));
  }, []);

  const createTopic = useCallback(async (input: TopicInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const saved = await db.createTopic(userId, input);
    // Callers may add an entry to the new topic before the next render.
    topicsRef.current = [saved, ...topicsRef.current];
    setTopics((current) => [saved, ...current]);
    return saved;
  }, [resumeCache, userId]);

  const updateTopic = useCallback(async (id: string, patch: TopicPatch) => {
    resumeCache();
    const saved = await db.updateTopic(id, patch);
    setTopics((current) => replaceById(current, saved));
    return saved;
  }, [resumeCache]);

  const deleteTopic = useCallback(async (id: string) => {
    resumeCache();
    await db.deleteTopic(id);
    setTopics((current) => removeById(current, id));
    setEntries((current) => current.filter((entry) => entry.topic_id !== id));
  }, [resumeCache]);

  const createEntry = useCallback(async (input: EntryInput) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    validateEntry(input);
    if (input.topic_id && !topicsRef.current.some((topic) => topic.id === input.topic_id)) {
      throw new Error('That topic was not found. Pick another one.');
    }
    const saved = await db.createEntry(userId, input);
    setEntries((current) => [...current, saved]);
    bumpTopic(saved.topic_id, saved.updated_at);
    return saved;
  }, [bumpTopic, resumeCache, userId]);

  const updateEntry = useCallback(async (id: string, patch: EntryPatch) => {
    resumeCache();
    const previous = entriesRef.current.find((entry) => entry.id === id);
    if (!previous) throw new Error('That note was not found.');
    const optimistic: TopicEntry = { ...previous, ...patch };
    validateEntry(optimistic);
    setEntries((current) => replaceById(current, optimistic));
    try {
      const saved = await db.updateEntry(id, patch);
      setEntries((current) => replaceById(current, saved));
      bumpTopic(saved.topic_id, saved.updated_at);
      return saved;
    } catch (error) {
      setEntries((current) => replaceById(current, previous));
      throw error;
    }
  }, [bumpTopic, resumeCache]);

  const deleteEntry = useCallback(async (id: string) => {
    resumeCache();
    const previous = entriesRef.current;
    setEntries((current) => removeById(current, id));
    try {
      await db.deleteEntry(id);
    } catch (error) {
      setEntries(previous);
      throw error;
    }
  }, [resumeCache]);

  const moveEntry = useCallback(async (id: string, topicId: string | null) => {
    return updateEntry(id, { topic_id: topicId });
  }, [updateEntry]);

  const convertEntryToTask = useCallback(async (entry: TopicEntry) => {
    const text = entryText(entry).trim();
    const [firstLine, ...rest] = text.split('\n');
    return createTask({
      title: (firstLine ?? '').trim().slice(0, 200) || 'Follow up',
      description: rest.join('\n').trim(),
      status: 'todo',
      priority: 'normal',
      due_date: '',
      goal_id: null,
      is_top_priority: false,
    });
  }, [createTask]);

  const convertInboxToNote = useCallback(async (item: InboxItem) => {
    const entry = await createEntry({
      topic_id: null,
      kind: 'text',
      content: [item.title, item.content ?? ''].filter((part) => part.trim()).join('\n\n'),
      items: [],
    });
    try {
      await updateInboxItem(item.id, { is_archived: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not archive the capture.';
      throw new Error(`${message} The note was still created.`);
    }
    return entry;
  }, [createEntry, updateInboxItem]);

  const convertInboxToGoal = useCallback(async (item: InboxItem) => {
    const goal = await createGoal({
      title: item.title,
      description: item.content ?? '',
      target_date: '',
      status: 'active',
    });
    try {
      await updateInboxItem(item.id, { is_archived: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not archive the capture.';
      throw new Error(`${message} The goal was still created.`);
    }
    return goal;
  }, [createGoal, updateInboxItem]);

  const convertNoteToTask = useCallback(async (note: Note) => {
    return createTask({
      title: note.title,
      description: note.content,
      status: 'todo',
      priority: 'normal',
      due_date: '',
      goal_id: null,
      is_top_priority: false,
    });
  }, [createTask]);

  const saveDailyLog = useCallback(async (entryDate: string, content: string) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const saved = await db.saveDailyLog(userId, entryDate, content);
    setLogs((current) => upsertLog(current, saved));
  }, [resumeCache, userId]);

  const saveReview = useCallback(async (draft: ReviewDraft) => {
    resumeCache();
    if (!userId) throw new Error('Sign in before saving.');
    const saved = await db.saveReview(userId, draft);
    setReviews((current) => upsertReview(current, saved));
  }, [resumeCache, userId]);

  const exportSnapshot = useCallback(async () => {
    const data = await db.fetchWorkspace();
    applyData(data);
    return data;
  }, [applyData]);

  return {
    profile,
    tasks,
    goals,
    notes,
    inbox,
    logs,
    reviews,
    topics,
    entries,
    loading,
    loadError,
    refresh,
    createTask,
    updateTask,
    setTaskStatus,
    deleteTask,
    createGoal,
    updateGoal,
    deleteGoal,
    createNote,
    updateNote,
    deleteNote,
    createInboxItem,
    updateInboxItem,
    deleteInboxItem,
    convertInboxToTask,
    convertInboxToNote,
    convertInboxToGoal,
    convertNoteToTask,
    createTopic,
    updateTopic,
    deleteTopic,
    createEntry,
    updateEntry,
    deleteEntry,
    moveEntry,
    convertEntryToTask,
    saveDailyLog,
    saveReview,
    exportSnapshot,
    clearDeviceCache,
  };
}
