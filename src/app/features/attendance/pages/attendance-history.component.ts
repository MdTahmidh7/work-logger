import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceStatCardComponent } from '../components/attendance-stat-card.component';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';

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
  selector: 'app-attendance-history',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, AttendanceStatCardComponent],
  template: `
    <div class="history-wrapper">
      <div class="history-page">
        <div class="page-header">
          <div>
            <h1>Attendance History</h1>
            <p class="subtitle">{{ dayRows().length }} days</p>
          </div>
          <a routerLink="/attendance" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
            Dashboard
          </a>
        </div>

        <div class="filter-bar">
          <div class="range-input">
            <mat-icon>event</mat-icon>
            <input type="date" [value]="filterStart()" (change)="onFilterStartChange($event)" class="date-input">
          </div>
          <span class="range-sep">to</span>
          <div class="range-input">
            <mat-icon>event</mat-icon>
            <input type="date" [value]="filterEnd()" [max]="maxDate()" (change)="onFilterEndChange($event)" class="date-input">
          </div>
        </div>

        <div class="stats-grid">
          <app-attendance-stat-card [data]="statsData()[0]" />
          <app-attendance-stat-card [data]="statsData()[1]" />
          <app-attendance-stat-card [data]="statsData()[2]" />
          <app-attendance-stat-card [data]="statsData()[3]" />
        </div>

        <div class="history-section">
          <div class="table-header">
            <div class="th icon-col"></div>
            <div class="th">Date</div>
            <div class="th">Day</div>
            <div class="th">Punch In</div>
            <div class="th">Punch Out</div>
            <div class="th">Working Hour</div>
            <div class="th">Status</div>
            <div class="th"></div>
          </div>
          @for (row of dayRows(); track row.date) {
            <div class="table-row"
                 [class.absent-row]="!row.attendance"
                 [class.workday]="row.attendance && !row.isFriday && !row.isSaturday"
                 [class.friday]="row.isFriday"
                 [class.saturday]="row.isSaturday"
                 [class.today]="row.isToday">
              <div class="td icon-col">
                @if (row.attendance) {
                  <div class="status-dot" [class]="row.attendance.status"></div>
                } @else {
                  <div class="status-dot absent"></div>
                }
              </div>
              <div class="td date-cell">
                <span class="date-text">{{ formatDate(row.date) }}</span>
              </div>
              <div class="td day-cell" [class.holiday]="row.isFriday || row.isSaturday">
                {{ row.dayName }}
              </div>
              <div class="td punch-in-cell">
                @if (row.attendance) {
                  <mat-icon class="cell-icon punch-in-icon">login</mat-icon>
                  <span>{{ formatTime(row.attendance.firstPunchIn) }}</span>
                } @else {
                  <span class="no-data">--</span>
                }
              </div>
              <div class="td punch-out-cell">
                @if (row.attendance?.lastPunchOut) {
                  <mat-icon class="cell-icon punch-out-icon">logout</mat-icon>
                  <span>{{ formatTime(row.attendance!.lastPunchOut!) }}</span>
                } @else {
                  <span class="no-data">--</span>
                }
              </div>
              <div class="td hours-cell">
                @if (row.attendance && row.attendance.workingMinutes > 0) {
                  <span class="hours-badge" [class.friday-badge]="row.isFriday" [class.saturday-badge]="row.isSaturday">
                    {{ formatWorkingHours(row.attendance.workingMinutes) }}
                  </span>
                } @else {
                  <span class="no-data">--</span>
                }
              </div>
              <div class="td status-cell">
                @if (row.attendance) {
                  <span class="status-badge" [class]="row.attendance.status">
                    {{ formatStatus(row.attendance.status) }}
                  </span>
                } @else {
                  <span class="status-badge absent">Absent</span>
                }
              </div>
              <div class="td actions-cell">
                @if (row.attendance) {
                  <a [routerLink]="['/attendance/edit', row.attendance.id]" class="edit-link">
                    <mat-icon class="edit-icon">edit</mat-icon>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .history-page { padding-top: 82px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .back-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
      text-decoration: none; font-family: 'Inter', sans-serif;
    }
    .back-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); border-color: var(--pwl-primary); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }

    .range-input {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--pwl-surface);
      border-radius: 10px;
      border: 1px solid var(--pwl-divider);
    }
    .range-input mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--pwl-text-secondary); }

    .date-input {
      border: none;
      background: transparent;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: var(--pwl-text-primary);
      outline: none;
      width: 120px;
    }

    .range-sep { color: var(--pwl-text-tertiary); font-size: 13px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

    .history-section {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 40px 100px 80px 120px 120px 110px 100px 50px;
      padding: 12px 20px;
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
      grid-template-columns: 40px 100px 80px 120px 120px 110px 100px 50px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.2s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.today { border-left: 3px solid var(--pwl-primary); }
    .table-row.workday { background: rgba(13, 148, 136, 0.03); }
    .table-row.friday { background: rgba(255, 204, 0, 0.05); }
    .table-row.saturday { background: rgba(255, 107, 107, 0.05); }
    .table-row.absent-row { background: rgba(156, 163, 175, 0.04); }
    .table-row.absent-row.friday { background: rgba(255, 204, 0, 0.05); }
    .table-row.absent-row.saturday { background: rgba(255, 107, 107, 0.05); }

    .td { font-size: 13px; color: var(--pwl-text-primary); display: flex; align-items: center; gap: 6px; }

    .icon-col { justify-content: center; }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.working { background: #0d9488; box-shadow: 0 0 6px rgba(13, 148, 136, 0.4); }
    .status-dot.completed { background: #16a34a; }
    .status-dot.absent { background: #d1d5db; }

    .date-text { font-weight: 500; }

    .day-cell { color: var(--pwl-text-secondary); font-size: 12px; }
    .day-cell.holiday { font-weight: 600; }

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
    .status-badge.absent { background: rgba(156, 163, 175, 0.15); color: #6b7280; }
    .status-badge.working { background: rgba(13, 148, 136, 0.15); color: #0d9488; }
    .status-badge.completed { background: rgba(34, 197, 94, 0.15); color: #16a34a; }

    .actions-cell { justify-content: center; }

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
      .stats-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 12px; }
      .table-header, .table-row {
        grid-template-columns: 32px 80px 60px 90px 90px 80px 80px 40px;
        padding: 8px 12px;
        font-size: 11px;
      }
      .cell-icon { display: none; }
    }
  `]
})
export class AttendanceHistoryPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);

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
      return {
        date: dateStr,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        isFriday: day.getDay() === 5,
        isSaturday: day.getDay() === 6,
        attendance: map.get(dateStr) || null,
        isToday: dateStr === today
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
      this.filterStart.set(value);
      this.loadData();
    }
  }

  onFilterEndChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
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

  formatStatus(status: string): string {
    return status.replace('_', ' ');
  }
}