import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StatisticCardComponent } from '../../shared/components/statistic-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { TodayAttendanceCardComponent } from '../attendance/components/today-attendance-card.component';
import { AttendanceActionButtonComponent } from '../attendance/components/attendance-action-button.component';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkLog } from '../../core/models/work-log.model';
import { Attendance } from '../attendance/models/attendance.model';
import { AttendanceService } from '../attendance/services/attendance.service';
import { WorkLogService } from '../work-log/services/work-log.service';
import { formatWorkingHoursColon } from '../../core/utils/format.utils';
import { getDaysInMonth, parseISO } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule,
            StatisticCardComponent, ChartCardComponent, DateFilterComponent,
            TodayAttendanceCardComponent, AttendanceActionButtonComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dateUtils = inject(DateUtilsService);
  private attendanceService = inject(AttendanceService);
  private workLogService = inject(WorkLogService);
  private notify = inject(NotificationService);
  private readonly PAGE_SIZE = 7;

  logs = signal<WorkLog[]>([]);
  currentPage = signal(0);
  todayAttendance = signal<Attendance | null>(null);
  attendanceRecords = signal<Attendance[]>([]);

  statsData = computed(() => {
    const all = this.logs();
    const totalMinutes = all.reduce((s, l) => s + l.durationMinutes, 0);
    const days = new Set(all.map(l => l.date));
    const avg = days.size > 0 ? totalMinutes / 60 / days.size : 0;

    const today = this.dateUtils.today();
    const todayMinutes = all.filter(l => l.date === today).reduce((s, l) => s + l.durationMinutes, 0);

    return [
      {
        icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)',
        valueColor: '#6750a4', value: (totalMinutes / 60).toFixed(1) + 'h', label: 'Total Hours'
      },
      {
        icon: 'today', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)',
        valueColor: '#0d9488', value: (todayMinutes / 60).toFixed(1) + 'h', label: 'Today\'s Hours'
      },
      {
        icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)',
        cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)',
        valueColor: '#d97706', value: avg.toFixed(1) + 'h', label: 'Avg Hours/Day'
      }
    ];
  });

  attendanceStats = computed(() => {
    const records = this.attendanceRecords();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalDays = 30;
    let presentDays = 0;
    let nfohDays = 0;

    records.forEach((att) => {
      if (att.workingMinutes >= 420) {
        presentDays++;
      } else {
        nfohDays++;
      }
    });

    const absentDays = totalDays - presentDays - nfohDays;
    return { presentDays, absentDays, nfohDays };
  });

  workLogStats = computed(() => {
    const logs = this.logs();
    const today = this.dateUtils.today();
    const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);
    const todayMinutes = logs.filter(l => l.date === today).reduce((s, l) => s + l.durationMinutes, 0);
    const days = new Set(logs.map(l => l.date));
    const avgMinutes = days.size > 0 ? totalMinutes / days.size : 0;

    return {
      totalHours: (totalMinutes / 60).toFixed(1) + 'h',
      todayHours: this.formatWorkingHours(todayMinutes),
      avgHours: (avgMinutes / 60).toFixed(2) + 'h'
    };
  });

  hourlyLabels = computed(() => Array.from({ length: 24 }, (_, i) => `${i}:00`));

  hourlyDataset = computed(() => {
    const today = this.dateUtils.today();
    const todayLogs = this.logs().filter(l => l.date === today);
    const hourlyData = new Array(24).fill(0);
    for (const log of todayLogs) {
      const hour = new Date(log.createdAt).getHours();
      hourlyData[hour] += log.durationMinutes / 60;
    }
    return [{ label: 'Hours', data: hourlyData.map(h => +h.toFixed(1)), color: '#6750a4' }];
  });

  monthlyLabels = computed(() => {
    const range = this.dateUtils.getDateRange('thisMonth');
    const date = parseISO(range.startDate);
    const days = getDaysInMonth(date);
    return Array.from({ length: days }, (_, i) => `${i + 1}`);
  });

  monthlyDataset = computed(() => {
    const range = this.dateUtils.getDateRange('thisMonth');
    const days = getDaysInMonth(parseISO(range.startDate));
    const dailyData = new Array(days).fill(0);
    for (const log of this.logs()) {
      const day = parseISO(log.date).getDate();
      if (day >= 1 && day <= days) {
        dailyData[day - 1] += log.durationMinutes / 60;
      }
    }
    return [{ label: 'Hours', data: dailyData.map(h => +h.toFixed(1)), color: '#0d9488' }];
  });

  groupedLogs = computed(() => {
    const logs = this.logs().slice(-50);
    const groups: { [key: string]: WorkLog[] } = {};
    for (const log of logs) {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        logs: groups[date],
        dayName: this.dateUtils.getDayName(date),
        totalHours: this.dateUtils.formatDuration(groups[date].reduce((s, l) => s + l.durationMinutes, 0)),
        isFriday: this.dateUtils.isFriday(date),
        isSaturday: this.dateUtils.isSaturday(date)
      }));
  });

  totalPages = computed(() => Math.ceil(this.groupedLogs().length / this.PAGE_SIZE));

  pagedLogs = computed(() => {
    const start = this.currentPage() * this.PAGE_SIZE;
    return this.groupedLogs().slice(start, start + this.PAGE_SIZE);
  });

  async ngOnInit(): Promise<void> {
    const range = this.dateUtils.getDateRange('thisMonth');
    this.logs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
    this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    this.attendanceRecords.set(await this.attendanceService.getAttendanceByDateRange(startDate, endDate));
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.currentPage.set(0);
    this.logs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
  }

  async handleAttendanceAction(): Promise<void> {
    try {
      if (this.todayAttendance()) {
        await this.attendanceService.updatePunchOut();
        this.notify.success('Punch Out recorded successfully');
      } else {
        await this.attendanceService.createPunchIn();
        this.notify.success('Punch In recorded successfully');
      }
      this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);
    } catch (error) {
      this.notify.error(error instanceof Error ? error.message : 'Failed to record attendance');
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) this.currentPage.update(p => p + 1);
  }

  formatShortDate(date: string): string {
    return this.dateUtils.formatShortDate(date);
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }

  formatWorkingHours(minutes: number): string {
    return formatWorkingHoursColon(minutes);
  }
}
