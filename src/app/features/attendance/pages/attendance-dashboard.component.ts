import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceActionButtonComponent } from '../components/attendance-action-button.component';
import { TodayAttendanceCardComponent } from '../components/today-attendance-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';
import { DateUtilsService } from '../../../core/services/date-utils.service';
import { WorkLogService } from '../../work-log/services/work-log.service';
import { WorkLog } from '../../../core/models/work-log.model';
import {
  format,
  subDays,
  eachDayOfInterval,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-attendance-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    AttendanceActionButtonComponent,
    TodayAttendanceCardComponent,
  ],
  templateUrl: './attendance-dashboard.component.html',
  styleUrls: ['./attendance-dashboard.component.scss'],
})
export class AttendanceDashboardPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private dateUtils = inject(DateUtilsService);
  private workLogService = inject(WorkLogService);

  todayAttendance = signal<Attendance | null>(null);
  attendanceMap = signal<Map<string, Attendance>>(new Map());
  workLogMap = signal<Map<string, number>>(new Map());
  filterStart = signal(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  filterEnd = signal(format(new Date(), 'yyyy-MM-dd'));
  maxDate = signal(format(new Date(), 'yyyy-MM-dd'));

  dayRows = computed(() => {
    const start = parseISO(this.filterStart());
    const end = parseISO(this.filterEnd());
    const days = eachDayOfInterval({ start, end });
    const map = this.attendanceMap();
    const wlogMap = this.workLogMap();
    const today = format(new Date(), 'yyyy-MM-dd');

    return days.reverse().map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const attendance = map.get(dateStr) || null;
      const totalLoggedMinutes = wlogMap.get(dateStr) || 0;
      return {
        date: dateStr,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        attendance,
        totalLoggedMinutes,
        isToday: dateStr === today,
        isFriday: day.getDay() === 5,
        isSaturday: day.getDay() === 6,
        getStatus: (): string => {
          if (!attendance) return 'Absent';
          if (attendance.workingMinutes >= 420) return 'Present';
          return 'NFOH';
        },
      };
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.todayAttendance.set(
      (await this.attendanceService.getTodayAttendance()) || null,
    );

    const records = await this.attendanceService.getAttendanceByDateRange(
      this.filterStart(),
      this.filterEnd(),
    );

    const map = new Map<string, Attendance>();
    for (const record of records) {
      map.set(record.date, record);
    }
    this.attendanceMap.set(map);

    const logs = await this.workLogService.getByRange(this.filterStart(), this.filterEnd());
    const wlogMap = new Map<string, number>();
    for (const log of logs) {
      wlogMap.set(log.date, (wlogMap.get(log.date) || 0) + log.durationMinutes);
    }
    this.workLogMap.set(wlogMap);
  }

  onFilterStartChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      const start = parseISO(value);
      const end = parseISO(this.filterEnd());
      const diffDays = differenceInCalendarDays(end, start);

      if (diffDays > 31) {
        this.notify.warning(
          'Maximum date range is 31 days (1 month). Please select a shorter range.',
        );
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
        this.notify.warning(
          'Maximum date range is 31 days (1 month). Please select a shorter range.',
        );
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

  async handleAction(): Promise<void> {
    try {
      if (this.todayAttendance()) {
        await this.attendanceService.updatePunchOut();
        this.notify.success('Punch Out recorded successfully');
      } else {
        await this.attendanceService.createPunchIn();
        this.notify.success('Punch In recorded successfully');
      }
      await this.loadData();
    } catch (error) {
      this.notify.error(error instanceof Error ? error.message : 'Failed to record attendance');
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
