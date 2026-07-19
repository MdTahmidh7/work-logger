export interface WorkLog {
  id?: number;
  title: string;
  details?: string;
  durationMinutes: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export type DateFilterType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DashboardStats {
  totalTasks: number;
  totalHours: number;
  averageHoursPerDay: number;
  averageTaskDuration: number;
  longestWorkingDay: { date: string; hours: number };
  mostProductiveDay: { date: string; tasks: number };
}

export interface BackupData {
  version: string;
  exportedAt: string;
  app: string;
  data: {
    workLogs: WorkLog[];
  };
}
