import { Injectable } from '@angular/core';
import { Dexie, Table } from 'dexie';
import { Attendance } from '../models/attendance.model';

const DB_NAME = 'personal-work-log-db';
const DB_VERSION = 2;

class AttendanceDatabase extends Dexie {
  attendance!: Table<Attendance, number>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      attendance: '++id, date, status, createdAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class AttendanceRepository {
  private db = new AttendanceDatabase();

  async getAll(): Promise<Attendance[]> {
    return this.db.attendance.toArray();
  }

  async getByDate(date: string): Promise<Attendance | undefined> {
    return this.db.attendance.where('date').equals(date).first();
  }

  async getByRange(startDate: string, endDate: string): Promise<Attendance[]> {
    return this.db.attendance
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getById(id: number): Promise<Attendance | undefined> {
    return this.db.attendance.get(id);
  }

  async create(attendance: Attendance): Promise<number> {
    return this.db.attendance.add(attendance);
  }

  async update(id: number, data: Partial<Attendance>): Promise<number> {
    return this.db.attendance.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async import(records: Attendance[]): Promise<number> {
    await this.db.attendance.clear();
    let count = 0;
    for (const record of records) {
      const { id, ...rest } = record;
      await this.db.attendance.add(rest as Attendance);
      count++;
    }
    return count;
  }

  async clear(): Promise<void> {
    await this.db.attendance.clear();
  }
}
