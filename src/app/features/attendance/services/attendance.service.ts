import { Injectable } from '@angular/core';
import { db } from '../../../core/database/database.service';
import { Attendance, MonthlyStatistics } from '../models/attendance.model';
import { format, parseISO, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  async getTodayAttendance(): Promise<Attendance | undefined> {
    const today = this.getTodayString();
    return db.attendance.where('date').equals(today).first();
  }

  async getAttendanceHistory(): Promise<Attendance[]> {
    return db.attendance.toArray();
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<Attendance[]> {
    return db.attendance
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getAttendanceByDate(date: string): Promise<Attendance | undefined> {
    return db.attendance.where('date').equals(date).first();
  }

  async createPunchIn(): Promise<Attendance> {
    const today = this.getTodayString();
    const now = new Date().toISOString();
    const timeStr = format(new Date(), 'HH:mm');

    const existing = await this.getTodayAttendance();
    if (existing) {
      throw new Error('Already punched in today');
    }

    const attendance: Attendance = {
      date: today,
      firstPunchIn: timeStr,
      lastPunchOut: null,
      workingMinutes: 0,
      status: 'working',
      createdAt: now,
      updatedAt: now
    };

    const id = await db.attendance.add(attendance);
    return { ...attendance, id };
  }

  async updatePunchOut(): Promise<Attendance> {
    const today = this.getTodayString();
    const now = new Date().toISOString();
    const timeStr = format(new Date(), 'HH:mm');

    const existing = await this.getTodayAttendance();
    if (!existing) {
      throw new Error('No punch in found for today');
    }

    const workingMinutes = this.calculateWorkingMinutes(existing.firstPunchIn, timeStr);

    await db.attendance.update(existing.id!, {
      lastPunchOut: timeStr,
      workingMinutes,
      status: 'completed',
      updatedAt: now
    });

    return {
      ...existing,
      lastPunchOut: timeStr,
      workingMinutes,
      status: 'completed',
      updatedAt: now
    };
  }

  calculateWorkingMinutes(punchIn: string, punchOut: string): number {
    const [inH, inM] = punchIn.split(':').map(Number);
    const [outH, outM] = punchOut.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    return Math.max(0, totalMinutes);
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  formatWorkingHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }

  async getMonthlyStatistics(startDate?: string, endDate?: string): Promise<MonthlyStatistics> {
    const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const records = await this.getAttendanceByDateRange(start, end);

    const presentDays = records.length;
    const daysInRange = this.getDaysBetween(start, end);
    const absentDays = Math.max(0, daysInRange - presentDays);

    const totalWorkingMinutes = records.reduce((sum, r) => sum + r.workingMinutes, 0);
    const totalWorkingHours = totalWorkingMinutes / 60;

    const averageWorkingHours = presentDays > 0 ? totalWorkingHours / presentDays : 0;

    const longestRecord = records.reduce((longest, r) =>
      r.workingMinutes > (longest?.workingMinutes || 0) ? r : longest, records[0]);

    const earliestIn = records.reduce((earliest, r) =>
      !earliest || r.firstPunchIn < earliest.firstPunchIn ? r : earliest, records[0]);

    const latestOut = records.reduce((latest, r) =>
      r.lastPunchOut && (!latest?.lastPunchOut || r.lastPunchOut > latest.lastPunchOut) ? r : latest, records[0]);

    const attendancePercentage = daysInRange > 0 ? (presentDays / daysInRange) * 100 : 0;

    return {
      presentDays,
      absentDays,
      totalWorkingHours,
      averageWorkingHours,
      longestWorkingDay: longestRecord ? { date: longestRecord.date, hours: longestRecord.workingMinutes / 60 } : { date: '', hours: 0 },
      earliestPunchIn: earliestIn?.firstPunchIn || '--',
      latestPunchOut: latestOut?.lastPunchOut || '--',
      attendancePercentage
    };
  }

  async exportAttendance(): Promise<any> {
    const attendance = await db.attendance.toArray();
    const workLogs = await db.workLogs.toArray();
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      app: 'Personal Work Logger',
      data: { workLogs, attendance }
    };
  }

  async importAttendance(data: any): Promise<number> {
    if (data.data?.attendance) {
      await db.attendance.clear();
      let count = 0;
      for (const record of data.data.attendance) {
        const { id, ...rest } = record;
        await db.attendance.add(rest as Attendance);
        count++;
      }
      return count;
    }
    return 0;
  }

  async getAttendanceById(id: number): Promise<Attendance | undefined> {
    return db.attendance.get(id);
  }

  async updateAttendance(id: number, data: Partial<Attendance>): Promise<void> {
    await db.attendance.update(id, { ...data, updatedAt: new Date().toISOString() });
  }

  async createAttendance(data: Partial<Attendance>): Promise<Attendance> {
    const now = new Date().toISOString();
    const attendance: Attendance = {
      date: data.date!,
      firstPunchIn: data.firstPunchIn!,
      lastPunchOut: data.lastPunchOut || null,
      workingMinutes: data.workingMinutes || 0,
      status: data.status || 'working',
      createdAt: now,
      updatedAt: now
    };
    const id = await db.attendance.add(attendance);
    return { ...attendance, id };
  }

  private getTodayString(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  private getDaysBetween(start: string, end: string): number {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}