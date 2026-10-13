export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'normal' | 'high';
export type GoalStatus = 'active' | 'paused' | 'completed';
export type InboxItemType = 'unsorted' | 'task' | 'note' | 'goal';
export type ReviewType = 'daily' | 'weekly';

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  goal_id: string | null;
  is_top_priority: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxItem {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  item_type: InboxItemType;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewEntry {
  id: string;
  user_id: string;
  review_type: ReviewType;
  period_start: string;
  period_end: string;
  went_well: string | null;
  lessons_learned: string | null;
  improvements: string | null;
  next_focus: string | null;
  created_at: string;
  updated_at: string;
}

export type TopicStatus = 'active' | 'paused' | 'done';
export type EntryKind = 'text' | 'checklist';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  left_off: string;
  status: TopicStatus;
  is_pinned: boolean;
  last_activity_at: string;
  source_note_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicEntry {
  id: string;
  user_id: string;
  topic_id: string | null;
  kind: EntryKind;
  content: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface TopicInput {
  title: string;
  left_off?: string;
  status?: TopicStatus;
}

export interface TopicPatch {
  title?: string;
  left_off?: string;
  status?: TopicStatus;
  is_pinned?: boolean;
}

export interface EntryInput {
  topic_id: string | null;
  kind: EntryKind;
  content: string;
  items: ChecklistItem[];
}

export interface EntryPatch {
  topic_id?: string | null;
  kind?: EntryKind;
  content?: string;
  items?: ChecklistItem[];
}

export type AppView =
  | 'tasks'
  | 'notes'
  | 'topic'
  | 'activity'
  | 'today'
  | 'inbox'
  | 'daily-log'
  | 'goals'
  | 'reviews'
  | 'old-notes'
  | 'settings';

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  goal_id: string | null;
  is_top_priority: boolean;
}

export interface GoalInput {
  title: string;
  description: string;
  target_date: string;
  status: GoalStatus;
}

export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
  is_favorite: boolean;
}

export interface DailyLogInput {
  entry_date: string;
  content: string;
}

export interface InboxInput {
  title: string;
  content: string;
  item_type: InboxItemType;
}

export interface ReviewDraft {
  review_type: ReviewType;
  period_start: string;
  period_end: string;
  went_well: string;
  lessons_learned: string;
  improvements: string;
  next_focus: string;
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  goal_id?: string | null;
  is_top_priority?: boolean;
  completed_at?: string | null;
}

export interface GoalPatch {
  title?: string;
  description?: string | null;
  target_date?: string | null;
  status?: GoalStatus;
}

export interface NotePatch {
  title?: string;
  content?: string;
  tags?: string[];
  is_favorite?: boolean;
}

export interface InboxPatch {
  title?: string;
  content?: string | null;
  item_type?: InboxItemType;
  is_archived?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
