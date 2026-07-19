import { Dexie, Table } from 'dexie';
import { WorkLog, BackupData } from '../models/work-log.model';
import { Attendance } from '../../features/attendance/models/attendance.model';

const DB_NAME = 'personal-work-log-db';
const DB_VERSION = 2;

export class DatabaseService extends Dexie {
  workLogs!: Table<WorkLog, number>;
  attendance!: Table<Attendance, number>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      workLogs: '++id, title, date, createdAt',
      attendance: '++id, date, status, createdAt'
    });
  }

  async createLog(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return this.workLogs.add({
      ...log,
      createdAt: now,
      updatedAt: now
    } as WorkLog);
  }

  async updateLog(id: number, updates: Partial<WorkLog>): Promise<number> {
    return this.workLogs.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteLog(id: number): Promise<void> {
    await this.workLogs.delete(id);
  }

  async getLog(id: number): Promise<WorkLog | undefined> {
    return this.workLogs.get(id);
  }

  async getAllLogs(): Promise<WorkLog[]> {
    return this.workLogs.toArray();
  }

  async getLogsByDate(date: string): Promise<WorkLog[]> {
    return this.workLogs.where('date').equals(date).toArray();
  }

  async getLogsByRange(startDate: string, endDate: string): Promise<WorkLog[]> {
    return this.workLogs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async searchLogs(query: string): Promise<WorkLog[]> {
    const lowerQuery = query.toLowerCase();
    return this.workLogs
      .filter(log =>
        log.title.toLowerCase().includes(lowerQuery) ||
        !!(log.details && log.details.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async exportLogs(): Promise<BackupData> {
    const workLogs = await this.getAllLogs();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      app: 'Personal Work Logger',
      data: { workLogs }
    };
  }

  async importLogs(data: BackupData): Promise<number> {
    await this.workLogs.clear();
    let count = 0;
    for (const log of data.data.workLogs) {
      const { id, ...rest } = log;
      await this.workLogs.add(rest as WorkLog);
      count++;
    }
    return count;
  }

  async clearAll(): Promise<void> {
    await this.workLogs.clear();
    await this.attendance.clear();
  }

  async getStats(startDate?: string, endDate?: string): Promise<{
    totalTasks: number;
    totalHours: number;
    averageHoursPerDay: number;
    averageTaskDuration: number;
    longestWorkingDay: { date: string; hours: number };
    mostProductiveDay: { date: string; tasks: number };
  }> {
    let logs: WorkLog[];
    if (startDate && endDate) {
      logs = await this.getLogsByRange(startDate, endDate);
    } else {
      logs = await this.getAllLogs();
    }

    if (logs.length === 0) {
      return {
        totalTasks: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
        averageTaskDuration: 0,
        longestWorkingDay: { date: '', hours: 0 },
        mostProductiveDay: { date: '', tasks: 0 }
      };
    }

    const totalTasks = logs.length;
    const totalHours = logs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);
    const uniqueDays = new Set(logs.map(log => log.date));
    const averageHoursPerDay = totalHours / uniqueDays.size;
    const averageTaskDuration = logs.reduce((sum, log) => sum + log.durationMinutes, 0) / totalTasks;

    const dailyTotals: { [key: string]: { hours: number; tasks: number } } = {};
    for (const log of logs) {
      if (!dailyTotals[log.date]) {
        dailyTotals[log.date] = { hours: 0, tasks: 0 };
      }
      dailyTotals[log.date].hours += log.durationMinutes / 60;
      dailyTotals[log.date].tasks += 1;
    }

    const longestDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].hours - a[1].hours)[0];

    const mostProductiveDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].tasks - a[1].tasks)[0];

    return {
      totalTasks,
      totalHours,
      averageHoursPerDay,
      averageTaskDuration,
      longestWorkingDay: longestDay ? { date: longestDay[0], hours: longestDay[1].hours } : { date: '', hours: 0 },
      mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], tasks: mostProductiveDay[1].tasks } : { date: '', tasks: 0 }
    };
  }
}

export const db = new DatabaseService();