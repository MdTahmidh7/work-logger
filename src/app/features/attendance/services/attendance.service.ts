import { Injectable, inject } from '@angular/core';
import { AttendanceRepository } from '../../../core/repositories/attendance.repository';
import { WorkLogRepository } from '../../../core/repositories/work-log.repository';
import { Attendance, AttendanceBackupData } from '../../../core/models/attendance.model';
import { calculateWorkingMinutes } from '../../../core/utils/format.utils';
import { format, parseISO, startOfMonth } from 'date-fns';
import { MonthlyStatistics } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private attendanceRepo = inject(AttendanceRepository);
  private workLogRepo = inject(WorkLogRepository);

  async getTodayAttendance(): Promise<Attendance | undefined> {
    const today = this.getTodayString();
    return this.attendanceRepo.getByDate(today);
  }

  async getAttendanceHistory(): Promise<Attendance[]> {
    return this.attendanceRepo.getAll();
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<Attendance[]> {
    return this.attendanceRepo.getByRange(startDate, endDate);
  }

  async getAttendanceByDate(date: string): Promise<Attendance | undefined> {
    return this.attendanceRepo.getByDate(date);
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
      dayType: 'working',
      dayTypeNote: null,
      createdAt: now,
      updatedAt: now
    };

    const id = await this.attendanceRepo.create(attendance);
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

    const workingMinutes = calculateWorkingMinutes(existing.firstPunchIn, timeStr);

    await this.attendanceRepo.update(existing.id!, {
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
    const end = endDate || format(new Date(), 'yyyy-MM-dd');

    const records = await this.getAttendanceByDateRange(start, end);

    const presentDays = records.filter(r => r.dayType === 'working' && r.workingMinutes >= 420).length;
    const nfohDays = records.filter(r => r.dayType === 'working' && r.workingMinutes > 0 && r.workingMinutes < 420).length;
    const holidayDays = records.filter(r => r.dayType === 'holiday').length;
    const leaveDays = records.filter(r => r.dayType === 'leave').length;
    const daysInRange = this.getDaysBetween(start, end);
    const absentDays = Math.max(0, daysInRange - presentDays - nfohDays - holidayDays - leaveDays);

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
      holidayDays,
      leaveDays,
      totalWorkingHours,
      averageWorkingHours,
      longestWorkingDay: longestRecord ? { date: longestRecord.date, hours: longestRecord.workingMinutes / 60 } : { date: '', hours: 0 },
      earliestPunchIn: earliestIn?.firstPunchIn || '--',
      latestPunchOut: latestOut?.lastPunchOut || '--',
      attendancePercentage
    };
  }

  async exportAttendance(): Promise<AttendanceBackupData> {
    const attendance = await this.attendanceRepo.getAll();
    const workLogs = await this.workLogRepo.getAll();
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      app: 'Personal Work Logger',
      data: { workLogs, attendance }
    };
  }

  async importAttendance(data: AttendanceBackupData): Promise<number> {
    if (data.data?.attendance) {
      await this.attendanceRepo.clear();
      let count = 0;
      for (const record of data.data.attendance) {
        const { id, ...rest } = record;
        await this.attendanceRepo.create(rest as Attendance);
        count++;
      }
      return count;
    }
    return 0;
  }

  async clearAll(): Promise<void> {
    await this.attendanceRepo.clear();
  }

  async getAttendanceById(id: number): Promise<Attendance | undefined> {
    return this.attendanceRepo.getById(id);
  }

  async updateAttendance(id: number, data: Partial<Attendance>): Promise<void> {
    await this.attendanceRepo.update(id, { ...data, updatedAt: new Date().toISOString() });
  }

  async createAttendance(data: Partial<Attendance>): Promise<Attendance> {
    const now = new Date().toISOString();
    const attendance: Attendance = {
      date: data.date!,
      firstPunchIn: data.firstPunchIn || '',
      lastPunchOut: data.lastPunchOut || null,
      workingMinutes: data.workingMinutes || 0,
      status: data.status || 'working',
      dayType: data.dayType || 'working',
      dayTypeNote: data.dayTypeNote || null,
      createdAt: now,
      updatedAt: now
    };
    const id = await this.attendanceRepo.create(attendance);
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
