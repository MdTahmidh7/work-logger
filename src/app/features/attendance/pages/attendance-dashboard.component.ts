import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { AttendanceActionButtonComponent } from '../components/attendance-action-button.component';
import { TodayAttendanceCardComponent } from '../components/today-attendance-card.component';
import { AttendanceStatCardComponent } from '../components/attendance-stat-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';

interface DayRow {
  date: string;
  dayName: string;
  isFriday: boolean;
  isSaturday: boolean;
  attendance: Attendance | null;
  isToday: boolean;
}

@Component({
  standalone: true,
  selector: 'app-attendance-dashboard',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, FormsModule,
            AttendanceActionButtonComponent, TodayAttendanceCardComponent,
            AttendanceStatCardComponent],
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard">
        <div class="page-header">
          <div>
            <h1>Attendance</h1>
            <p class="subtitle">Track your daily attendance</p>
          </div>
          <a routerLink="/attendance/history" class="history-btn">
            <mat-icon>history</mat-icon>
            Full History
          </a>
        </div>

        <div class="main-content">
          <div class="action-section">
            <app-attendance-action-button
              [attendance]="todayAttendance()"
              (action)="handleAction()" />
          </div>

          <div class="card-section">
            <app-today-attendance-card [attendance]="todayAttendance()" />
          </div>
        </div>

        <div class="stats-grid">
          <app-attendance-stat-card [data]="statsData()[0]" />
          <app-attendance-stat-card [data]="statsData()[1]" />
          <app-attendance-stat-card [data]="statsData()[2]" />
          <app-attendance-stat-card [data]="statsData()[3]" />
        </div>

        <div class="recent-section">
          <div class="section-header">
            <h2>
              <mat-icon>calendar_today</mat-icon>
              Attendance History
            </h2>
            <div class="date-range-filter">
              <div class="range-input">
                <mat-icon>event</mat-icon>
                <input type="date" [value]="filterStart()" (change)="onFilterStartChange($event)" class="date-input">
              </div>
              <span class="range-sep">to</span>
              <div class="range-input">
                <mat-icon>event</mat-icon>
                <input type="date" [value]="filterEnd()" [max]="maxDate()" (change)="onFilterEndChange($event)" class="date-input">
              </div>
              <span class="days-info">{{ dayRows().length }} days</span>
            </div>
          </div>
          <div class="attendance-table">
            <div class="table-header">
              <div class="th icon-col"></div>
              <div class="th date-col">Date</div>
              <div class="th day-col">Day</div>
              <div class="th punch-in-col">Punch In</div>
              <div class="th punch-out-col">Punch Out</div>
              <div class="th hours-col">Working Hour</div>
              <div class="th status-col">Status</div>
              <div class="th edit-col"></div>
            </div>
            @for (row of dayRows(); track row.date) {
              <div class="table-row"
                   [class.absent-row]="!row.attendance"
                   [class.workday]="row.attendance && row.getStatus() === 'Present'"
                   [class.nfoh-row]="row.attendance && row.getStatus() === 'NFOH'"
                   [class.friday]="row.isFriday"
                   [class.saturday]="row.isSaturday"
                   [class.today]="row.isToday">
                <div class="td icon-col">
                  @if (row.attendance) {
                    <div class="status-dot" [class]="row.getStatus()"></div>
                  } @else {
                    <div class="status-dot absent"></div>
                  }
                </div>
                <div class="td date-col">
                  <span class="date-text">{{ formatDate(row.date) }}</span>
                </div>
                <div class="td day-col" [class.holiday]="row.isFriday || row.isSaturday">
                  {{ row.dayName }}
                </div>
                <div class="td punch-in-col">
                  @if (row.attendance) {
                    <mat-icon class="cell-icon punch-in-icon">login</mat-icon>
                    <span>{{ formatTime(row.attendance.firstPunchIn) }}</span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td punch-out-col">
                  @if (row.attendance?.lastPunchOut) {
                    <mat-icon class="cell-icon punch-out-icon">logout</mat-icon>
                    <span>{{ formatTime(row.attendance!.lastPunchOut!) }}</span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td hours-col">
                  @if (row.attendance && row.attendance.workingMinutes > 0) {
                    <span class="hours-badge" [class.friday-badge]="row.isFriday" [class.saturday-badge]="row.isSaturday">
                      {{ formatWorkingHours(row.attendance.workingMinutes) }}
                    </span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td status-col">
                  <span class="status-badge" [class]="row.getStatus()">
                    {{ row.getStatus() }}
                  </span>
                </div>
                <div class="td edit-col">
                  <a [routerLink]="['/attendance/edit', row.date]" class="edit-link">
                    <mat-icon class="edit-icon">edit</mat-icon>
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .dashboard { padding-top: 82px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .history-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
      text-decoration: none; font-family: 'Inter', sans-serif;
    }
    .history-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); border-color: var(--pwl-primary); }
    .history-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .main-content {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .action-section {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 32px;
    }

    .card-section { min-width: 0; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

    .recent-section {
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider); overflow: hidden;
    }

    .section-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-header h2 {
      font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;
    }
    .section-header h2 mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--pwl-primary); }

    .date-range-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .range-input {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--pwl-surface-variant);
      border-radius: 8px;
      border: 1px solid var(--pwl-divider);
    }
    .range-input mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--pwl-text-secondary); }

    .date-input {
      border: none;
      background: transparent;
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      color: var(--pwl-text-primary);
      outline: none;
      width: 100px;
    }

    .range-sep { color: var(--pwl-text-tertiary); font-size: 12px; }

    .days-info {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
      padding: 4px 10px;
      background: var(--pwl-primary-light);
      border-radius: 6px;
      color: var(--pwl-primary);
    }

    .attendance-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 40px 90px 70px 120px 120px 100px 90px 50px;
      gap: 8px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      background: var(--pwl-surface-variant);
    }

    .th {
      font-size: 11px;
      font-weight: 600;
      color: var(--pwl-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-row {
      display: grid;
      grid-template-columns: 40px 90px 70px 120px 120px 100px 90px 50px;
      gap: 8px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.2s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.today { border-left: 3px solid var(--pwl-primary); }
    .table-row.workday { background: rgba(13, 148, 136, 0.03); }
    .table-row.nfoh-row { background: rgba(217, 119, 6, 0.03); }
    .table-row.friday { background: rgba(255, 204, 0, 0.05); }
    .table-row.saturday { background: rgba(255, 107, 107, 0.05); }
    .table-row.absent-row { background: rgba(156, 163, 175, 0.04); }
    .table-row.absent-row.friday { background: rgba(255, 204, 0, 0.05); }
    .table-row.absent-row.saturday { background: rgba(255, 107, 107, 0.05); }

    .td { font-size: 13px; color: var(--pwl-text-primary); display: flex; align-items: center; gap: 6px; }

    .icon-col { justify-content: center; }
    .edit-col { justify-content: flex-end; }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.Present { background: #0d9488; box-shadow: 0 0 6px rgba(13, 148, 136, 0.4); }
    .status-dot.NFOH { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.4); }
    .status-dot.absent { background: #d1d5db; }

    .date-text { font-weight: 500; }

    .day-col { color: var(--pwl-text-secondary); font-size: 12px; }
    .day-col.holiday { font-weight: 600; }

    .cell-icon { font-size: 14px; width: 14px; height: 14px; }
    .punch-in-icon { color: #0d9488; }
    .punch-out-icon { color: #dc2626; }

    .no-data { color: var(--pwl-text-tertiary); }

    .hours-badge {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 600;
      background: var(--pwl-primary-light); color: var(--pwl-primary);
    }
    .hours-badge.friday-badge { background: rgba(255, 204, 0, 0.15); color: #b38600; }
    .hours-badge.saturday-badge { background: rgba(255, 107, 107, 0.15); color: #cc3333; }

    .status-badge {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 600; text-transform: capitalize;
    }
    .status-badge.Absent { background: rgba(156, 163, 175, 0.15); color: #6b7280; }
    .status-badge.Present { background: rgba(13, 148, 136, 0.15); color: #0d9488; }
    .status-badge.NFOH { background: rgba(217, 119, 6, 0.15); color: #d97706; }

    .edit-link {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px;
      color: var(--pwl-text-secondary); transition: all 0.2s;
      text-decoration: none;
    }
    .edit-link:hover { background: var(--pwl-primary-light); color: var(--pwl-primary); }
    .edit-icon { font-size: 16px; width: 16px; height: 16px; }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .main-content { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
      .section-header { flex-direction: column; align-items: flex-start; }
      .table-header, .table-row {
        grid-template-columns: 32px 70px 50px 80px 80px 70px 70px 40px;
        gap: 4px;
        padding: 8px 12px;
        font-size: 11px;
      }
      .cell-icon { display: none; }
    }
  `]
})
export class AttendanceDashboardPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  todayAttendance = signal<Attendance | null>(null);
  attendanceMap = signal<Map<string, Attendance>>(new Map());
  monthlyStats = signal<any>(null);
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
        { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: '0', label: 'Absent Days' },
        { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: '0h', label: 'Total Working Hours' },
        { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: '0%', label: 'Attendance %' }
      ];
    }

    return [
      { icon: 'event_available', iconColor: '#0d9488', iconBg: 'rgba(13, 148, 136, 0.1)', cardBg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(13, 148, 136, 0.02) 100%)', valueColor: '#0d9488', value: stats.presentDays, label: 'Present Days' },
      { icon: 'event_busy', iconColor: '#dc2626', iconBg: 'rgba(220, 38, 38, 0.1)', cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)', valueColor: '#dc2626', value: stats.absentDays, label: 'Absent Days' },
      { icon: 'schedule', iconColor: '#6750a4', iconBg: 'rgba(103, 80, 164, 0.1)', cardBg: 'linear-gradient(135deg, rgba(103, 80, 164, 0.05) 0%, rgba(103, 80, 164, 0.02) 100%)', valueColor: '#6750a4', value: stats.totalWorkingHours.toFixed(1) + 'h', label: 'Total Working Hours' },
      { icon: 'trending_up', iconColor: '#d97706', iconBg: 'rgba(217, 119, 6, 0.1)', cardBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(217, 119, 6, 0.02) 100%)', valueColor: '#d97706', value: stats.attendancePercentage.toFixed(0) + '%', label: 'Attendance %' }
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.todayAttendance.set(await this.attendanceService.getTodayAttendance() || null);

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
      this.filterStart.set(value);
      this.loadData();
    }
  }

  onFilterEndChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      const start = parseISO(this.filterStart());
      const end = parseISO(value);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

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
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to record attendance');
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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