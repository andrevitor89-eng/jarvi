import type { ListType } from '../components/layout/Sidebar/Sidebar';
import type { SettingsPage } from '../components/features/account/SettingsDialog/SettingsDialog';

export const VIEW_PARAM = 'view';
export const LIST_PARAM = 'lista';
export const CATEGORY_PARAM = 'categoria';
export const TASK_PARAM = 'task';
export const CHAT_PARAM = 'chat';
export const CONTA_PARAM = 'conta';
export const FEEDBACK_PARAM = 'feedback';
export const APP_PARAM = 'app';

const VIEW_TO_LIST: Record<string, ListType> = {
  lista: 'all',
  calendario: 'later',
  'sem-data': 'noDate',
  vencidas: 'overdue',
  recorrentes: 'recurring',
  semana: 'week',
  hoje: 'today',
  amanha: 'tomorrow',
  importante: 'important',
  concluidas: 'completed',
};

const LIST_TO_VIEW: Partial<Record<ListType, string>> = {
  later: 'calendario',
  noDate: 'sem-data',
  overdue: 'vencidas',
  recurring: 'recorrentes',
  week: 'semana',
  today: 'hoje',
  tomorrow: 'amanha',
  important: 'importante',
  completed: 'concluidas',
};

const SETTINGS_PAGES: readonly SettingsPage[] = [
  'profile',
  'payments',
  'apps',
  'memory',
  'categories',
  'filters',
  'appearance',
];

export function listTypeFromViewParam(view: string | null): ListType {
  if (!view) return 'all';
  return VIEW_TO_LIST[view] ?? 'all';
}

export function viewParamFromListType(list: ListType): string | null {
  return LIST_TO_VIEW[list] ?? null;
}

export function parseSettingsPage(value: string | null): SettingsPage | null {
  if (!value) return null;
  return SETTINGS_PAGES.includes(value as SettingsPage) ? (value as SettingsPage) : null;
}

export function tasksPathname(pathname: string): string {
  if (pathname === '/' || pathname === '/settings' || pathname === '/calendar') {
    return '/tasks';
  }
  return pathname;
}
