import { Dexie, Table } from 'dexie';
import { WorkLog } from '../models/work-log.model';
import { Attendance } from '../models/attendance.model';

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
}

export const db = new DatabaseService();
