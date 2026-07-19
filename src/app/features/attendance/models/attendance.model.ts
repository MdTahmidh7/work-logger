export interface Attendance {
  id?: number;
  date: string;
  firstPunchIn: string;
  lastPunchOut: string | null;
  workingMinutes: number;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'not_started' | 'working' | 'completed';

export interface AttendanceFilterType {
  value: string;
  label: string;
  icon: string;
}

export interface MonthlyStatistics {
  presentDays: number;
  absentDays: number;
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
    workLogs: any[];
    attendance: Attendance[];
  };
}