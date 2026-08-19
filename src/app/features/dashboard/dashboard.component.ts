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
import { subDays, format } from 'date-fns';

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
  private static readonly DAY_COLORS = {
    working: '#0d9488',
    weekend: '#6b7280',
    holiday: '#3b82f6',
    leave: '#f97316'
  };
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

    const byDate = new Map<string, typeof records[number]>();
    for (const att of records) {
      const existing = byDate.get(att.date);
      if (!existing || att.updatedAt > existing.updatedAt) {
        byDate.set(att.date, att);
      }
    }

    byDate.forEach((att) => {
      if (att.date < thirtyDaysAgoStr || att.date > todayStr) return;
      if (att.dayType === 'holiday') {
        holidayDays++;
      } else if (att.dayType === 'leave') {
        leaveDays++;
      } else if (att.workingMinutes >= DashboardComponent.FULL_DAY_MINUTES) {
        presentDays++;
      } else if (att.workingMinutes > 0) {
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

  attendanceBreakdown = computed(() => {
    const s = this.attendanceStats();
    const items = [
      { label: 'Present', value: s.presentDays, color: '#0d9488' },
      { label: 'NFOH', value: s.nfohDays, color: '#d97706' },
      { label: 'Absent', value: s.absentDays, color: '#9ca3af' },
      { label: 'Holiday', value: s.holidayDays, color: '#3b82f6' },
      { label: 'Leave', value: s.leaveDays, color: '#f97316' }
    ].filter(i => i.value > 0);
    return {
      labels: items.map(i => i.label),
      datasets: [{
        label: 'Days',
        data: items.map(i => i.value),
        color: '#6750a4',
        backgroundColor: items.map(i => i.color)
      }]
    };
  });

  last30Labels = computed(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => format(subDays(today, 29 - i), 'MMM d'));
  });

  last30Dataset = computed(() => {
    const today = new Date();
    const byDate = new Map<string, number>();
    for (const log of this.logs()) {
      byDate.set(log.date, (byDate.get(log.date) || 0) + log.durationMinutes);
    }
    const deduped = new Map<string, Attendance>();
    for (const att of this.attendanceRecords()) {
      const existing = deduped.get(att.date);
      if (!existing || att.updatedAt > existing.updatedAt) {
        deduped.set(att.date, att);
      }
    }
    const rawHours: number[] = [];
    const types: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = subDays(today, 29 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      rawHours.push(+((byDate.get(dateStr) || 0) / 60).toFixed(1));
      const type = deduped.get(dateStr)?.dayType;
      const day = d.getDay();
      if (type === 'holiday') {
        types.push('holiday');
      } else if (type === 'leave') {
        types.push('leave');
      } else if (day === 5 || day === 6) {
        types.push('weekend');
      } else {
        types.push('working');
      }
    }
    const maxHours = Math.max(...rawHours, 0);
    const data = rawHours.map((h, i) => (types[i] === 'working' ? h : maxHours));
    const colors = types.map(t => DashboardComponent.DAY_COLORS[t as keyof typeof DashboardComponent.DAY_COLORS]);
    const tooltipLabels = rawHours.map((h, i) => {
      if (types[i] === 'working') return undefined;
      const label = types[i] === 'weekend' ? 'Weekend'
        : types[i] === 'holiday' ? 'Holiday'
        : 'Leave';
      return `${label} · ${h}h`;
    });
    return [{
      label: 'Hours',
      data,
      color: '#0d9488',
      backgroundColor: colors,
      minBarLength: 4,
      tooltipLabels
    }];
  });

  dayChartLegend = [
    { label: 'Working Day', color: DashboardComponent.DAY_COLORS.working },
    { label: 'Weekend (Fri/Sat)', color: DashboardComponent.DAY_COLORS.weekend },
    { label: 'Holiday', color: DashboardComponent.DAY_COLORS.holiday },
    { label: 'Leave', color: DashboardComponent.DAY_COLORS.leave }
  ];

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
