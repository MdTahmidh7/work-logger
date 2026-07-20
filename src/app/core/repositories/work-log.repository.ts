import { Injectable } from '@angular/core';
import { Dexie, Table } from 'dexie';
import { WorkLog, BackupData } from '../models/work-log.model';

const DB_NAME = 'personal-work-log-db';
const DB_VERSION = 2;

class WorkLogDatabase extends Dexie {
  workLogs!: Table<WorkLog, number>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      workLogs: '++id, title, date, createdAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class WorkLogRepository {
  private db = new WorkLogDatabase();

  async create(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return this.db.workLogs.add({
      ...log,
      createdAt: now,
      updatedAt: now,
    } as WorkLog);
  }

  async update(id: number, updates: Partial<WorkLog>): Promise<number> {
    return this.db.workLogs.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: number): Promise<void> {
    await this.db.workLogs.delete(id);
  }

  async getById(id: number): Promise<WorkLog | undefined> {
    return this.db.workLogs.get(id);
  }

  async getAll(): Promise<WorkLog[]> {
    return this.db.workLogs.toArray();
  }

  async getByDate(date: string): Promise<WorkLog[]> {
    return this.db.workLogs.where('date').equals(date).toArray();
  }

  async getByRange(startDate: string, endDate: string): Promise<WorkLog[]> {
    return this.db.workLogs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async search(query: string): Promise<WorkLog[]> {
    const lowerQuery = query.toLowerCase();
    return this.db.workLogs
      .filter(log =>
        log.title.toLowerCase().includes(lowerQuery) ||
        !!(log.details && log.details.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async import(data: BackupData): Promise<number> {
    await this.db.workLogs.clear();
    let count = 0;
    for (const log of data.data.workLogs) {
      const { id, ...rest } = log;
      await this.db.workLogs.add(rest as WorkLog);
      count++;
    }
    return count;
  }

  async clear(): Promise<void> {
    await this.db.workLogs.clear();
  }
}
