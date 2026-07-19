import { Dexie, Table } from 'dexie';
import { WorkLog } from '../models/work-log.model';

export interface DatabaseConfig {
  name: string;
  version: number;
}

export class DatabaseService extends Dexie {
  workLogs!: Table<WorkLog, number>;

  constructor(config: DatabaseConfig) {
    super(config.name);
    this.version(config.version).stores({
      workLogs: 'id,date'
    });
  }

  // CRUD Operations
  async createLog(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const timestamp = new Date().toISOString();
    return this.workLogs.add({
      ...log,
      createdAt: timestamp,
      updatedAt: timestamp
    } as WorkLog);
  }

  async updateLog(id: number, updates: Partial<WorkLog>): Promise<number> {
    const timestamp = new Date().toISOString();
    return this.workLogs.update(id, { ...updates, updatedAt: timestamp });
  }

  async deleteLog(id: number): Promise<void> {
    await this.workLogs.delete(id);
  }

  async getLog(id: number): Promise<WorkLog | undefined> {
    return this.workLogs.get(id);
  }

  // Query Operations
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
        (log.details && log.details.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async getLogsWithDateGroups(): Promise<{ [date: string]: WorkLog[] }> {
    const logs = await this.getAllLogs();
    return logs.reduce((groups, log) => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }
      groups[log.date].push(log);
      return groups;
    }, {} as { [date: string]: WorkLog[] });
  }

  // Backup & Restore
  async exportLogs(): Promise<{ version: string; exportedAt: string; data: { workLogs: WorkLog[] } }> {
    const workLogs = await this.getAllLogs();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: { workLogs }
    };
  }

  async importLogs(data: { version: string; exportedAt: string; data: { workLogs: WorkLog[] } }): Promise<number> {
    const added = await Promise.all(
      data.data.workLogs.map(log => this.createLog(log))
    );
    return added.length;
  }

  // Utility
  async clearAll(): Promise<void> {
    await this.workLogs.clear();
  }

  async getStats(): Promise<{
    totalTasks: number;
    totalHours: number;
    averageHoursPerDay: number;
    averageTaskDuration: number;
    longestWorkingDay: { date: string; hours: number };
    mostProductiveDay: { date: string; tasks: number };
  }> {
    const logs = await this.getAllLogs();
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

    const dailyTotals = logs.reduce((days, log) => {
      if (!days[log.date]) {
        days[log.date] = { hours: 0, tasks: 0 };
      }
      days[log.date].hours += log.durationMinutes / 60;
      days[log.date].tasks += 1;
      return days;
    }, {} as { [date: string]: { hours: number; tasks: number } });

    const totalTasks = logs.length;
    const totalHours = logs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);
    const averageHoursPerDay = totalHours / Object.keys(dailyTotals).length || 0;
    const averageTaskDuration = logs.reduce((sum, log) => sum + log.durationMinutes, 0) / totalTasks;

    const longestDay = Object.entries(dailyTotals).sort((a, b) => b[1].hours - a[1].hours)[0];
    const mostProductiveDay = Object.entries(dailyTotals).sort((a, b) => b[1].tasks - a[1].tasks)[0];

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

export const dbConfig: DatabaseConfig = {
  name: 'personal-work-log',
  version: 1
};

export const db = new DatabaseService(dbConfig);