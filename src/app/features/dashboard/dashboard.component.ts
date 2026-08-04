import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { TodayAttendanceCardComponent } from '../attendance/components/today-attendance-card.component';
import { AttendanceActionButtonComponent } from '../attendance/components/attendance-action-button.component';
import { DashboardSkeletonComponent } from '../../shared/components/skeletons/dashboard-skeleton.component';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { NotificationService } from '../../core/services/notification.service';
import { ResponsiveService } from '../../core/services/responsive.service';
import { WorkLog } from '../../core/models/work-log.model';
import { Attendance } from '../attendance/models/attendance.model';
import { AttendanceService } from '../attendance/services/attendance.service';
import { WorkLogService } from '../work-log/services/work-log.service';
import { formatWorkingHoursColon } from '../../core/utils/format.utils';
import { getDaysInMonth, parseISO, subDays, format, isAfter, isBefore } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule,
            MatTooltipModule, ChartCardComponent, DateFilterComponent,
            TodayAttendanceCardComponent, AttendanceActionButtonComponent,
            DashboardSkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private static readonly FULL_DAY_MINUTES = 420;
  private dateUtils = inject(DateUtilsService);
  private attendanceService = inject(AttendanceService);
  private workLogService = inject(WorkLogService);
  private notify = inject(NotificationService);
  responsive = inject(ResponsiveService);
  private readonly PAGE_SIZE = 7;

  loading = signal(true);
  submitting = signal(false);
  logs = signal<WorkLog[]>([]);
  currentPage = signal(0);
  todayAttendance = signal<Attendance | null>(null);
  attendanceRecords = signal<Attendance[]>([]);

  attendanceStats = computed(() => {
    const records = this.attendanceRecords();
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 29);
    const todayStr = format(now, 'yyyy-MM-dd');
    const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

    let presentDays = 0;
    let nfohDays = 0;
    let holidayDays = 0;
    let leaveDays = 0;
    let workingDays = 0;

    const current = new Date(thirtyDaysAgo);
    while (current <= now) {
      const day = current.getDay();
      if (day !== 5 && day !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    records.forEach((att) => {
      if (att.date < thirtyDaysAgoStr || att.date > todayStr) return;
      if (att.dayType === 'holiday') {
        holidayDays++;
      } else if (att.dayType === 'leave') {
        leaveDays++;
      } else if (att.workingMinutes >= DashboardComponent.FULL_DAY_MINUTES) {
        presentDays++;
      } else {
        nfohDays++;
      }
    });

    const absentDays = Math.max(0, workingDays - presentDays - nfohDays - holidayDays - leaveDays);
    return { presentDays, absentDays, nfohDays, holidayDays, leaveDays };
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
    const logs = this.logs();
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
    this.loading.set(true);
    try {
      const range = this.dateUtils.getDateRange('last30Days');

      const [logs, attendance, records] = await Promise.all([
        this.workLogService.getByRange(range.startDate, range.endDate).catch(e => {
          console.error('Failed to load work logs:', e);
          this.notify.error('Failed to load work logs: ' + (e instanceof Error ? e.message : 'Unknown error'));
          return [] as WorkLog[];
        }),
        this.attendanceService.getTodayAttendance().catch(e => {
          console.error('Failed to load attendance:', e);
          return undefined as Attendance | undefined;
        }),
        this.attendanceService.getAttendanceByDateRange(range.startDate, range.endDate).catch(e => {
          console.error('Failed to load attendance records:', e);
          return [] as Attendance[];
        })
      ]);

      this.logs.set(logs);
      this.todayAttendance.set(attendance || null);
      this.attendanceRecords.set(records);
    } finally {
      this.loading.set(false);
    }
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.currentPage.set(0);
    this.loading.set(true);
    try {
      this.logs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
    } catch (e) {
      console.error('Failed to load work logs:', e);
      this.notify.error('Failed to load work logs: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      this.loading.set(false);
    }
  }

  async handleAttendanceAction(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
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
    } finally {
      this.submitting.set(false);
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
