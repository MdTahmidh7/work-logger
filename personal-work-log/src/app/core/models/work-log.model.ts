import { makeAutoObservable } from 'rxjs';

export interface WorkLog {
  id?: number;
  title: string;
  details?: string;
  durationMinutes: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseStats {
  totalTasks: number;
  totalHours: number;
  averageHoursPerDay: number;
  averageTaskDuration: number;
  longestWorkingDay: { date: string; hours: number };
  mostProductiveDay: { date: string; tasks: number };
}

export interface DateFilter {
  startDate: string;
  endDate: string;
}

export type DateFilterType = 
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export class WorkLogState {
  workLogs: WorkLog[] = [];
  filteredWorkLogs: WorkLog[] = [];
  currentFilter: DateFilter = { startDate: '', endDate: '' };
  currentFilterType: DateFilterType = 'today';
  selectedDate: string | null = null;
  searchQuery: string = '';
  isLoading = false;
  isProcessing = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Actions
  setWorkLogs(logs: WorkLog[]): void {
    this.workLogs = logs;
    this.applyFilters();
  }

  addWorkLog(log: WorkLog): void {
    this.workLogs.unshift(log);
    this.applyFilters();
  }

  updateWorkLog(updatedLog: WorkLog): void {
    const index = this.workLogs.findIndex(log => log.id === updatedLog.id);
    if (index !== -1) {
      this.workLogs[index] = updatedLog;
      this.applyFilters();
    }
  }

  deleteWorkLog(id: number): void {
    this.workLogs = this.workLogs.filter(log => log.id !== id);
    this.applyFilters();
  }

  setFilter(filter: DateFilter, type: DateFilterType = 'custom'): void {
    this.currentFilter = filter;
    this.currentFilterType = type;
    this.applyFilters();
  }

  setFilterType(type: DateFilterType): void {
    this.currentFilterType = type;
    this.applyFilters();
  }

  setSelectedDate(date: string | null): void {
    this.selectedDate = date;
    this.applyFilters();
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }

  setError(error: string | null): void {
    this.error = error;
  }

  // Computed
  get groupedWorkLogs(): { [date: string]: WorkLog[] } {
    return this.filteredWorkLogs.reduce((groups, log) => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }
      groups[log.date].push(log);
      return groups;
    }, {} as { [date: string]: WorkLog[] });
  }

  get stats(): DatabaseStats {
    if (this.filteredWorkLogs.length === 0) {
      return {
        totalTasks: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
        averageTaskDuration: 0,
        longestWorkingDay: { date: '', hours: 0 },
        mostProductiveDay: { date: '', tasks: 0 }
      };
    }

    const totalTasks = this.filteredWorkLogs.length;
    const totalHours = this.filteredWorkLogs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);
    const uniqueDays = new Set(this.filteredWorkLogs.map(log => log.date));
    const averageHoursPerDay = totalHours / uniqueDays.size || 0;

    const dailyTotals = this.filteredWorkLogs.reduce((days, log) => {
      if (!days[log.date]) {
        days[log.date] = { hours: 0, tasks: 0 };
      }
      days[log.date].hours += log.durationMinutes / 60;
      days[log.date].tasks += 1;
      return days;
    }, {} as { [date: string]: { hours: number; tasks: number } });

    const longestWorkingDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].hours - a[1].hours)[0];

    const mostProductiveDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].tasks - a[1].tasks)[0];

    const averageTaskDuration = this.filteredWorkLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / totalTasks;

    return {
      totalTasks,
      totalHours,
      averageHoursPerDay,
      averageTaskDuration,
      longestWorkingDay: longestWorkingDay ? { date: longestWorkingDay[0], hours: longestWorkingDay[1].hours } : { date: '', hours: 0 },
      mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], tasks: mostProductiveDay[1].tasks } : { date: '', tasks: 0 }
    };
  }

  private applyFilters(): void {
    let filtered = [...this.workLogs];

    // Apply date filter
    if (this.currentFilterType !== 'custom' && this.currentFilter.startDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        const startDate = new Date(this.currentFilter.startDate);
        return logDate >= startDate;
      });
    }

    if (this.currentFilterType !== 'custom' && this.currentFilter.endDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        const endDate = new Date(this.currentFilter.endDate);
        return logDate <= endDate;
      });
    }

    if (this.currentFilterType === 'custom' && this.currentFilter.startDate && this.currentFilter.endDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date);
        const startDate = new Date(this.currentFilter.startDate);
        const endDate = new Date(this.currentFilter.endDate);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    // Apply date selection filter
    if (this.selectedDate) {
      filtered = filtered.filter(log => log.date === this.selectedDate);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.title.toLowerCase().includes(query) ||
        (log.details && log.details.toLowerCase().includes(query))
      );
    }

    this.filteredWorkLogs = filtered;
  }
}