import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceStatCardComponent } from '../components/attendance-stat-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance, MonthlyStatistics } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';
import { format, parseISO, eachDayOfInterval, subDays, differenceInCalendarDays } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-attendance-history',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, AttendanceStatCardComponent],
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.scss']
})
export class AttendanceHistoryPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  attendanceMap = signal<Map<string, Attendance>>(new Map());
  monthlyStats = signal<MonthlyStatistics | null>(null);
  filterStart = signal(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  filterEnd = signal(format(new Date(), 'yyyy-MM-dd'));
  maxDate = signal(format(new Date(), 'yyyy-MM-dd'));

  dayRows = computed(() => {
    const start = parseISO(this.filterStart());
    const end = parseISO(this.filterEnd());
    const days = eachDayOfInterval({ start, end });
    const map = this.attendanceMap();
    const today = format(new Date(), 'yyyy-MM-dd');

    return days.reverse().map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const attendance = map.get(dateStr) || null;
      return {
        date: dateStr,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        isFriday: day.getDay() === 5,
        isSaturday: day.getDay() === 6,
        attendance,
        isToday: dateStr === today,
        getStatus: (): string => {
          if (!attendance) return 'Absent';
          if (attendance.workingMinutes >= 420) return 'Present';
          return 'NFOH';
        }
      };
    });
  });

  statsData = computed(() => {
    const stats = this.monthlyStats();
    if (!stats) {
      return [
        { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '0', label: 'Present Days' },
        { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: '0h', label: 'Average Hours' },
        { icon: 'access_time', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: '--', label: 'Earliest Punch In' },
        { icon: 'access_time', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: '--', label: 'Latest Punch Out' }
      ];
    }

    return [
      { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: stats.presentDays, label: 'Present Days' },
      { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: stats.averageWorkingHours.toFixed(1) + 'h', label: 'Average Hours' },
      { icon: 'access_time', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: this.formatTime(stats.earliestPunchIn), label: 'Earliest Punch In' },
      { icon: 'access_time', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: this.formatTime(stats.latestPunchOut), label: 'Latest Punch Out' }
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const records = await this.attendanceService.getAttendanceByDateRange(
      this.filterStart(),
      this.filterEnd()
    );

    const map = new Map<string, Attendance>();
    for (const record of records) {
      map.set(record.date, record);
    }
    this.attendanceMap.set(map);

    this.monthlyStats.set(await this.attendanceService.getMonthlyStatistics(
      this.filterStart(),
      this.filterEnd()
    ));
  }

  onFilterStartChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      const start = parseISO(value);
      const end = parseISO(this.filterEnd());
      const diffDays = differenceInCalendarDays(end, start);

      if (diffDays > 31) {
        this.notify.warning('Maximum date range is 31 days (1 month). Please select a shorter range.');
        return;
      }
      if (diffDays < 0) {
        this.notify.warning('Start date cannot be after end date');
        return;
      }

      this.filterStart.set(value);
      this.loadData();
    }
  }

  onFilterEndChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      const start = parseISO(this.filterStart());
      const end = parseISO(value);
      const diffDays = differenceInCalendarDays(end, start);

      if (diffDays > 31) {
        this.notify.warning('Maximum date range is 31 days (1 month). Please select a shorter range.');
        return;
      }
      if (diffDays < 0) {
        this.notify.warning('End date cannot be before start date');
        return;
      }

      this.filterEnd.set(value);
      this.loadData();
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatTime(time: string | null): string {
    if (!time || time === '--') return '--';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  formatWorkingHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}