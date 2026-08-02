import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { WorkLog } from '../models/work-log.model';
import { BackupData } from '../models/work-log.model';

@Injectable({ providedIn: 'root' })
export class WorkLogRepository {
  private supabase = inject(SupabaseService);
  private readonly TABLE = 'work_logs';

  private async getUserId(): Promise<string> {
    const userId = await this.supabase.getUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  private mapRow(row: any): WorkLog {
    return {
      id: row.id,
      title: row.title,
      details: row.details,
      durationMinutes: row.duration_minutes,
      date: row.work_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapForInsert(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
    return {
      user_id: userId,
      title: log.title,
      details: log.details || null,
      duration_minutes: log.durationMinutes,
      work_date: log.date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async create(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .insert(this.mapForInsert(log, userId))
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async update(id: number, updates: Partial<WorkLog>): Promise<number> {
    const userId = await this.getUserId();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.details !== undefined) payload.details = updates.details;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.date !== undefined) payload.work_date = updates.date;

    const { error } = await this.supabase.supabase
      .from(this.TABLE)
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return 1;
  }

  async delete(id: number): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await this.supabase.supabase
      .from(this.TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getById(id: number): Promise<WorkLog | undefined> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return undefined;
    return this.mapRow(data);
  }

  async getAll(): Promise<WorkLog[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async getByDate(date: string): Promise<WorkLog[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async getByRange(startDate: string, endDate: string): Promise<WorkLog[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async search(query: string): Promise<WorkLog[]> {
    const userId = await this.getUserId();
    const sanitizedQuery = this.sanitizePostgrestFilter(query);
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${sanitizedQuery}%,details.ilike.%${sanitizedQuery}%`)
      .order('work_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  private sanitizePostgrestFilter(input: string): string {
    return input
      .replace(/%/g, '\\%')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  async import(data: BackupData): Promise<number> {
    const userId = await this.getUserId();

    const { error: deleteError } = await this.supabase.supabase
      .from(this.TABLE)
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (!data.data.workLogs || data.data.workLogs.length === 0) return 0;

    const rows = data.data.workLogs.map(log => ({
      user_id: userId,
      title: log.title,
      details: log.details || null,
      duration_minutes: log.durationMinutes,
      work_date: log.date,
      created_at: log.createdAt || new Date().toISOString(),
      updated_at: log.updatedAt || new Date().toISOString(),
    }));

    const { error } = await this.supabase.supabase
      .from(this.TABLE)
      .insert(rows);

    if (error) throw error;
    return rows.length;
  }

  async clear(): Promise<void> {
    const userId = await this.getUserId();
    const { error } = await this.supabase.supabase
      .from(this.TABLE)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }
}
