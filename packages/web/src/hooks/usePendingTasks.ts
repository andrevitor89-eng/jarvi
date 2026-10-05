import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/ui/Sonner';
import { apiClient, ApiError } from '../lib/apiClient';

export interface PendingTask {
  id: string;
  user_id: string;
  source: string;
  raw_content: string | null;
  transcription: string | null;
  original_whatsapp_content: string | null;
  media_attachments: string | null;
  suggested_title: string;
  suggested_description: string | null;
  suggested_priority: 'low' | 'medium' | 'high' | null;
  suggested_due_date: string | null;
  suggested_time: string | null;
  suggested_category: string | null;
  status: 'awaiting_confirmation' | 'confirmed' | 'rejected' | 'expired';
  whatsapp_message_sid: string | null;
  whatsapp_phone: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePendingTasksResult {
  pendingTasks: PendingTask[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  confirm: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  update: (
    id: string,
    updates: Partial<{
      title: string;
      description: string | null;
      priority: 'low' | 'medium' | 'high' | null;
      dueDate: string | null;
      time: string | null;
      category: string | null;
    }>
  ) => Promise<void>;
}

const SOCKET_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/api\/?$/, '');

export const usePendingTasks = (): UsePendingTasksResult => {
  const { token } = useAuth();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setPendingTasks([]);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await apiClient.get<PendingTask[]>('/api/pending-tasks');
      setPendingTasks(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && (fetchError.status === 401 || fetchError.status === 403)) {
        setPendingTasks([]);
        setError(null);
        return;
      }
      console.error('Error loading pending tasks:', fetchError);
      setError('Não foi possível carregar as tarefas pendentes.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const confirm = useCallback(
    async (id: string) => {
      if (!token) return;

      await apiClient.post(`/api/pending-tasks/${id}/confirm`);
      setPendingTasks((prev) => prev.filter((task) => task.id !== id));
      toast.success('Tarefa confirmada e criada com sucesso.');
    },
    [token]
  );

  const reject = useCallback(
    async (id: string) => {
      if (!token) return;

      await apiClient.post(`/api/pending-tasks/${id}/reject`);
      setPendingTasks((prev) => prev.filter((task) => task.id !== id));
      toast.success('Sugestão rejeitada.');
    },
    [token]
  );

  const update = useCallback(
    async (
      id: string,
      updates: Partial<{
        title: string;
        description: string | null;
        priority: 'low' | 'medium' | 'high' | null;
        dueDate: string | null;
        time: string | null;
        category: string | null;
      }>
    ) => {
      if (!token) return;

      const updatedTask = await apiClient.put<PendingTask>(`/api/pending-tasks/${id}`, updates);
      setPendingTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    },
    [token]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(SOCKET_ORIGIN || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('pending-task:created', (payload: { id: string; source?: string }) => {
      const sourceLabel = payload.source === 'gmail' ? 'Gmail' : 'WhatsApp';
      toast.success(`Nova tarefa sugerida via ${sourceLabel}.`);
      void refresh();
    });

    socket.on('pending-task:updated', (payload: { id: string; status: string }) => {
      setPendingTasks((prev) => prev.filter((task) => task.id !== payload.id));
    });

    socket.on('connect_error', (socketError) => {
      console.error('Pending tasks socket error:', socketError);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, refresh]);

  return {
    pendingTasks,
    isLoading,
    error,
    refresh,
    confirm,
    reject,
    update,
  };
};
