import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Attendance } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceRepository {
  private supabase = inject(SupabaseService);
  private readonly TABLE = 'attendance';

  private async getUserId(): Promise<string> {
    const userId = await this.supabase.getUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  private mapRow(row: any): Attendance {
    return {
      id: row.id,
      date: row.attendance_date,
      firstPunchIn: row.first_punch_in,
      lastPunchOut: row.last_punch_out,
      workingMinutes: row.working_minutes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapForInsert(att: Attendance, userId: string) {
    return {
      user_id: userId,
      attendance_date: att.date,
      first_punch_in: att.firstPunchIn,
      last_punch_out: att.lastPunchOut,
      working_minutes: att.workingMinutes,
      status: att.status,
      created_at: att.createdAt || new Date().toISOString(),
      updated_at: att.updatedAt || new Date().toISOString(),
    };
  }

  async getAll(): Promise<Attendance[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async getByDate(date: string): Promise<Attendance | undefined> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('attendance_date', date)
      .single();

    if (error || !data) return undefined;
    return this.mapRow(data);
  }

  async getByRange(startDate: string, endDate: string): Promise<Attendance[]> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async getById(id: number): Promise<Attendance | undefined> {
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

  async create(attendance: Attendance): Promise<number> {
    const userId = await this.getUserId();
    const { data, error } = await this.supabase.supabase
      .from(this.TABLE)
      .insert(this.mapForInsert(attendance, userId))
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async update(id: number, data: Partial<Attendance>): Promise<number> {
    const userId = await this.getUserId();
    const payload: any = { updated_at: new Date().toISOString() };
    if (data.firstPunchIn !== undefined) payload.first_punch_in = data.firstPunchIn;
    if (data.lastPunchOut !== undefined) payload.last_punch_out = data.lastPunchOut;
    if (data.workingMinutes !== undefined) payload.working_minutes = data.workingMinutes;
    if (data.status !== undefined) payload.status = data.status;

    const { error } = await this.supabase.supabase
      .from(this.TABLE)
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return 1;
  }

  async import(records: Attendance[]): Promise<number> {
    const userId = await this.getUserId();

    const { error: deleteError } = await this.supabase.supabase
      .from(this.TABLE)
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (!records || records.length === 0) return 0;

    const rows = records.map(att => ({
      user_id: userId,
      attendance_date: att.date,
      first_punch_in: att.firstPunchIn,
      last_punch_out: att.lastPunchOut,
      working_minutes: att.workingMinutes,
      status: att.status,
      created_at: att.createdAt || new Date().toISOString(),
      updated_at: att.updatedAt || new Date().toISOString(),
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
