import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StatisticCardComponent } from '../../shared/components/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { WorkLog } from '../../core/models/work-log.model';
import { DatabaseService } from '../../core/database/database.service';

interface DashboardStats {
  totalTasks: number;
  totalHours: number;
  averageHoursPerDay: number;
  averageTaskDuration: number;
  longestWorkingDay: { date: string; hours: number };
  mostProductiveDay: { date: string; tasks: number };
  changeFromPreviousDay: number;
  hoursChangeFromPreviousDay: number;
}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    StatisticCardComponent,
    ChartCardComponent,
    DateFilterComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private databaseService = inject(DatabaseService);

  loading = signal(true);
  currentStats = signal<DashboardStats | null>(null);
  chartData = signal<any>(null);
  tasksChartData = signal<any>(null);

  // Date filter state
  currentFilter = signal<any>({ startDate: '', endDate: '' });
  currentFilterType = signal<string>('today');

  constructor() {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    try {
      const logs = await this.databaseService.getAllLogs();n
      this.processDashboardData(logs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private processDashboardData(logs: WorkLog[]): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get current period (today for demo)
    const currentPeriodStart = this.formatDate(today);
    const currentPeriodEnd = this.formatDate(today);

    // Get previous period (yesterday for demo)
    const previousPeriodStart = this.formatDate(yesterday);
    const previousPeriodEnd = this.formatDate(yesterday);

    const currentLogs = logs.filter(log =>
      log.date >= currentPeriodStart && log.date <= currentPeriodEnd
    );

    const previousLogs = logs.filter(log =>
      log.date >= previousPeriodStart && log.date <= previousPeriodEnd
    );

    // Calculate stats
    const currentStats = this.calculateStats(currentLogs, previousLogs);
    this.currentStats.set(currentStats);

    // Prepare chart data
    this.prepareChartData(currentLogs);
    this.prepareTasksChartData(currentLogs);
  }

  private calculateStats(currentLogs: WorkLog[], previousLogs: WorkLog[]): DashboardStats {
    const totalTasks = currentLogs.length;
    const totalHours = currentLogs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);
    const uniqueDays = new Set(currentLogs.map(log => log.date));
    const averageHoursPerDay = totalHours / uniqueDays.size || 0;

    // Calculate daily totals
    const dailyTotals = currentLogs.reduce((days, log) => {
      if (!days[log.date]) {
        days[log.date] = { hours: 0, tasks: 0 };
      }
      days[log.date].hours += log.durationMinutes / 60;
      days[log.date].tasks += 1;
      return days;
    }, {} as { [date: string]: { hours: number; tasks: number } });

    // Find longest and most productive days
    const longestWorkingDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].hours - a[1].hours)[0];

    const mostProductiveDay = Object.entries(dailyTotals)
      .sort((a, b) => b[1].tasks - a[1].tasks)[0];

    // Calculate changes from previous period
    const previousTotalTasks = previousLogs.length;
    const previousTotalHours = previousLogs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);

    const taskChange = previousTotalTasks > 0 ? ((totalTasks - previousTotalTasks) / previousTotalTasks) * 100 : 0;
    const hoursChange = previousTotalHours > 0 ? ((totalHours - previousTotalHours) / previousTotalHours) * 100 : 0;

    return {
      totalTasks,
      totalHours,
      averageHoursPerDay,
      averageTaskDuration: totalTasks > 0 ? (currentLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / totalTasks) : 0,
      longestWorkingDay: longestWorkingDay ? { date: longestWorkingDay[0], hours: longestWorkingDay[1].hours } : { date: '', hours: 0 },
      mostProductiveDay: mostProductiveDay ? { date: mostProductiveDay[0], tasks: mostProductiveDay[1].tasks } : { date: '', tasks: 0 },
      changeFromPreviousDay: taskChange,
      hoursChangeFromPreviousDay: hoursChange
    };
  }

  private prepareChartData(logs: WorkLog[]): void {
    // Group logs by date
    const logsByDate = logs.reduce((groups, log) => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }
      groups[log.date].push(log);
      return groups;
    }, {} as { [date: string]: WorkLog[] });

    // Sort by date
    const sortedDates = Object.keys(logsByDate).sort();

    // Calculate daily hours
    const dailyHours = sortedDates.map(date => {
      const dayLogs = logsByDate[date];
      return dayLogs.reduce((sum, log) => sum + log.durationMinutes / 60, 0);
    });

    this.chartData.set({
      labels: sortedDates,
      values: dailyHours
    });
  }

  private prepareTasksChartData(logs: WorkLog[]): void {
    // Group logs by date
    const logsByDate = logs.reduce((groups, log) => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }
      groups[log.date].push(log);
      return groups;
    }, {} as { [date: string]: WorkLog[] });

    // Sort by date
    const sortedDates = Object.keys(logsByDate).sort();

    // Count tasks per day
    const tasksPerDay = sortedDates.map(date => logsByDate[date].length);

    this.tasksChartData.set({
      labels: sortedDates,
      values: tasksPerDay
    });
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onFilterChange(event: any): void {
    this.currentFilter.set(event.filter);
    this.currentFilterType.set(event.type);
    this.loadDashboardData();
  }
}
