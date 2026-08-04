import { WorkLog } from './work-log.model';

export type DayType = 'working' | 'holiday' | 'leave';

export interface Attendance {
  id?: number;
  date: string;
  firstPunchIn: string;
  lastPunchOut: string | null;
  workingMinutes: number;
  status: AttendanceStatus;
  dayType: DayType;
  dayTypeNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'not_started' | 'working' | 'completed';

export interface MonthlyStatistics {
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  leaveDays: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
  longestWorkingDay: { date: string; hours: number };
  earliestPunchIn: string;
  latestPunchOut: string;
  attendancePercentage: number;
}

export interface AttendanceBackupData {
  version: string;
  exportedAt: string;
  app: string;
  data: {
    workLogs: WorkLog[];
    attendance: Attendance[];
  };
}
