import { Injectable, inject } from '@angular/core';
import { Dexie, Table } from 'dexie';
import { WorkLog } from '../models/work-log.model';
import { Attendance } from '../models/attendance.model';
import { SupabaseService } from './supabase.service';

interface LocalWorkLog {
  id?: number;
  title: string;
  details?: string;
  durationMinutes: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalAttendance {
  id?: number;
  date: string;
  firstPunchIn: string;
  lastPunchOut: string | null;
  workingMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class LocalDatabase extends Dexie {
  workLogs!: Table<LocalWorkLog, number>;
  attendance!: Table<LocalAttendance, number>;

  constructor() {
    super('personal-work-log-db');
    this.version(2).stores({
      workLogs: '++id, title, date, createdAt',
      attendance: '++id, date, status, createdAt',
    });
  }
}

export interface MigrationResult {
  workLogsImported: number;
  attendanceImported: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class DataMigrationService {
  private supabase = inject(SupabaseService);
  private localDb = new LocalDatabase();

  async hasLocalData(): Promise<boolean> {
    try {
      const workLogCount = await this.localDb.workLogs.count();
      const attendanceCount = await this.localDb.attendance.count();
      return workLogCount > 0 || attendanceCount > 0;
    } catch {
      return false;
    }
  }

  async getLocalDataCounts(): Promise<{ workLogs: number; attendance: number }> {
    try {
      const workLogs = await this.localDb.workLogs.count();
      const attendance = await this.localDb.attendance.count();
      return { workLogs, attendance };
    } catch {
      return { workLogs: 0, attendance: 0 };
    }
  }

  async migrateToCloud(): Promise<MigrationResult> {
    const result: MigrationResult = { workLogsImported: 0, attendanceImported: 0, errors: [] };

    const userId = await this.supabase.getUserId();
    if (!userId) {
      result.errors.push('Not authenticated. Please log in first.');
      return result;
    }

    try {
      const localWorkLogs = await this.localDb.workLogs.toArray();
      if (localWorkLogs.length > 0) {
        const rows = localWorkLogs.map(log => ({
          user_id: userId,
          title: log.title,
          details: log.details || null,
          duration_minutes: log.durationMinutes,
          work_date: log.date,
          created_at: log.createdAt || new Date().toISOString(),
          updated_at: log.updatedAt || new Date().toISOString(),
        }));

        const { error } = await this.supabase.supabase
          .from('work_logs')
          .insert(rows);

        if (error) {
          result.errors.push(`Work logs: ${error.message}`);
        } else {
          result.workLogsImported = rows.length;
        }
      }
    } catch (e) {
      result.errors.push(`Work logs migration failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    try {
      const localAttendance = await this.localDb.attendance.toArray();
      if (localAttendance.length > 0) {
        const rows = localAttendance.map(att => ({
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
          .from('attendance')
          .insert(rows);

        if (error) {
          result.errors.push(`Attendance: ${error.message}`);
        } else {
          result.attendanceImported = rows.length;
        }
      }
    } catch (e) {
      result.errors.push(`Attendance migration failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    return result;
  }

  async clearLocalData(): Promise<void> {
    try {
      await this.localDb.workLogs.clear();
      await this.localDb.attendance.clear();
    } catch (e) {
      console.error('Failed to clear local data:', e);
    }
  }
}
