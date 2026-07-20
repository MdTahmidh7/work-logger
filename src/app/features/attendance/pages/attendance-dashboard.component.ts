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
import { db } from '../../../core/database/database.service';
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
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard">
        <div class="top-bar">
          <a routerLink="/attendance/history" class="history-btn">
            <mat-icon>history</mat-icon>
            Full History
          </a>
        </div>

        <div class="main-content">
          <div
            class="action-section"
            [class.bg-punch-in]="!todayAttendance()"
            [class.bg-punch-out]="todayAttendance()"
          >
            <app-attendance-action-button
              [attendance]="todayAttendance()"
              (action)="handleAction()"
            />
          </div>
          <div class="card-section">
            <app-today-attendance-card [attendance]="todayAttendance()" />
          </div>
        </div>

        <div class="recent-section">
          <div class="section-header">
            <div class="header-left">
              <mat-icon>calendar_today</mat-icon>
              <h2>Attendance History</h2>
            </div>
            <div class="date-range-filter">
              <div class="range-input">
                <mat-icon>event</mat-icon>
                <input
                  type="date"
                  [value]="filterStart()"
                  [max]="filterEnd()"
                  (change)="onFilterStartChange($event)"
                  class="date-input"
                />
              </div>
              <span class="range-sep">to</span>
              <div class="range-input">
                <mat-icon>event</mat-icon>
                <input
                  type="date"
                  [value]="filterEnd()"
                  [max]="maxDate()"
                  (change)="onFilterEndChange($event)"
                  class="date-input"
                />
              </div>
              <span class="days-info">{{ dayRows().length }} days</span>
            </div>
          </div>
          <div class="attendance-table">
            <div class="table-header">
              <div class="th col-date">DATE</div>
              <div class="th col-day">DAY</div>
              <div class="th col-punch-in">PUNCH IN</div>
              <div class="th col-punch-out">PUNCH OUT</div>
              <div class="th col-hours">WORKING HOUR</div>
              <div class="th col-logged">TOTAL LOGGED</div>
              <div class="th col-status">STATUS</div>
              <div class="th col-edit">ACTIONS</div>
            </div>
            @for (row of dayRows(); track row.date) {
              <div
                class="table-row"
                [class.status-present]="
                  row.attendance && row.getStatus() === 'Present'
                "
                [class.status-nfoh]="
                  row.attendance && row.getStatus() === 'NFOH'
                "
                [class.status-absent]="!row.attendance"
                [class.today]="row.isToday"
              >
                <div class="td col-date">
                  <div
                    class="status-dot"
                    [class.dot-present]="
                      row.attendance && row.getStatus() === 'Present'
                    "
                    [class.dot-nfoh]="
                      row.attendance && row.getStatus() === 'NFOH'
                    "
                    [class.dot-absent]="!row.attendance"
                  ></div>
                  <span class="date-text">{{ formatDate(row.date) }}</span>
                </div>
                <div class="td col-day">{{ row.dayName }}</div>
                <div class="td col-punch-in">
                  @if (row.attendance) {
                    <mat-icon class="cell-icon punch-in-icon">login</mat-icon>
                    <span>{{ formatTime(row.attendance.firstPunchIn) }}</span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td col-punch-out">
                  @if (row.attendance?.lastPunchOut) {
                    <mat-icon class="cell-icon punch-out-icon">logout</mat-icon>
                    <span>{{ formatTime(row.attendance!.lastPunchOut!) }}</span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td col-hours">
                  @if (row.attendance && row.attendance.workingMinutes > 0) {
                    <span class="hours-badge">{{
                      formatWorkingHours(row.attendance.workingMinutes)
                    }}</span>
                  } @else {
                    <span class="no-data">--</span>
                  }
                </div>
                <div class="td col-logged">
                  @if (row.totalLoggedMinutes > 0) {
                    <span class="logged-badge">{{
                      formatWorkingHours(row.totalLoggedMinutes)
                    }}</span>
                  } @else {
                    <a [routerLink]="['/work-log']" [queryParams]="{ date: row.date }" class="add-log-btn">
                      <mat-icon>add</mat-icon>
                    </a>
                  }
                </div>
                <div class="td col-status">
                  <span
                    class="status-badge"
                    [class.badge-present]="row.getStatus() === 'Present'"
                    [class.badge-nfoh]="row.getStatus() === 'NFOH'"
                    [class.badge-absent]="row.getStatus() === 'Absent'"
                  >
                    {{ row.getStatus() }}
                  </span>
                </div>
                <div class="td col-edit">
                  <a
                    [routerLink]="['/attendance/edit', row.date]"
                    class="edit-link"
                  >
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
  styles: [
    `
      .dashboard-wrapper {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 20px;
      }
      .dashboard {
        padding-top: 82px;
      }

      .top-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 20px;
      }

      .history-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid var(--pwl-divider);
        background: var(--pwl-surface);
        color: var(--pwl-text-secondary);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        font-family: 'Inter', sans-serif;
      }
      .history-btn:hover {
        background: var(--pwl-surface-variant);
        color: var(--pwl-text-primary);
        border-color: var(--pwl-primary);
      }
      .history-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .main-content {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }

      .action-section {
        border-radius: 14px;
        padding: 24px;
        transition: background 0.3s;
        display: flex;
        align-items: stretch;
      }

      .action-section.bg-punch-in {
        background: rgba(13, 148, 136, 0.06);
        border: 1px solid rgba(13, 148, 136, 0.12);
      }

      .action-section.bg-punch-out {
        background: rgba(220, 38, 38, 0.06);
        border: 1px solid rgba(220, 38, 38, 0.12);
      }

      .card-section {
        min-width: 0;
        flex: 1;
      }

      .recent-section {
        background: var(--pwl-surface);
        border-radius: 14px;
        border: 1px solid var(--pwl-divider);
        overflow: hidden;
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

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .header-left mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--pwl-primary);
      }

      .section-header h2 {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
      }

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
      .range-input mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--pwl-text-secondary);
      }

      .date-input {
        border: none;
        background: transparent;
        font-size: 12px;
        font-family: 'Inter', sans-serif;
        color: var(--pwl-text-primary);
        outline: none;
        width: 100px;
      }

      .range-sep {
        color: var(--pwl-text-tertiary);
        font-size: 12px;
      }

      .days-info {
        font-size: 12px;
        font-weight: 500;
        padding: 4px 10px;
        background: var(--pwl-primary-light);
        border-radius: 6px;
        color: var(--pwl-primary);
      }

      .attendance-table {
        width: 100%;
      }

      .table-header {
        display: grid;
        grid-template-columns: 1fr 60px 110px 110px 100px 100px 90px 50px;
        gap: 0;
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
        padding: 0 8px;
      }

      .th.col-edit {
        text-align: center;
      }

      .table-row {
        display: grid;
        grid-template-columns: 1fr 60px 110px 110px 100px 100px 90px 50px;
        gap: 0;
        padding: 12px 20px;
        border-bottom: 1px solid var(--pwl-divider);
        align-items: center;
        transition: background 0.2s;
      }

      .table-row:last-child {
        border-bottom: none;
      }
      .table-row:hover {
        filter: brightness(0.97);
      }

      .table-row.today {
        border-left: 3px solid var(--pwl-primary);
      }

      .table-row.status-present {
        background: rgba(13, 148, 136, 0.04);
      }
      .table-row.status-nfoh {
        background: rgba(217, 119, 6, 0.04);
      }
      .table-row.status-absent {
        background: rgba(156, 163, 175, 0.03);
      }

      .td {
        font-size: 13px;
        color: var(--pwl-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
      }

      .col-date {
        gap: 10px;
      }
      .col-edit {
        justify-content: center;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dot-present {
        background: #0d9488;
        box-shadow: 0 0 6px rgba(13, 148, 136, 0.4);
      }
      .dot-nfoh {
        background: #d97706;
        box-shadow: 0 0 6px rgba(217, 119, 6, 0.4);
      }
      .dot-absent {
        background: #d1d5db;
      }

      .date-text {
        font-weight: 500;
      }

      .cell-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .punch-in-icon {
        color: #0d9488;
      }
      .punch-out-icon {
        color: #dc2626;
      }

      .no-data {
        color: var(--pwl-text-tertiary);
      }

      .hours-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        background: var(--pwl-primary-light);
        color: var(--pwl-primary);
      }

      .logged-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        background: rgba(103, 80, 164, 0.1);
        color: #6750a4;
      }

      .add-log-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        background: rgba(13, 148, 136, 0.1);
        color: #0d9488;
        text-decoration: none;
        transition: all 0.2s;
      }

      .add-log-btn:hover {
        background: #0d9488;
        color: white;
        transform: scale(1.1);
      }

      .add-log-btn mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .status-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-absent {
        background: rgba(156, 163, 175, 0.15);
        color: #6b7280;
      }
      .badge-present {
        background: rgba(13, 148, 136, 0.15);
        color: #0d9488;
      }
      .badge-nfoh {
        background: rgba(217, 119, 6, 0.15);
        color: #d97706;
      }

      .edit-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        color: var(--pwl-text-secondary);
        transition: all 0.2s;
        text-decoration: none;
      }
      .edit-link:hover {
        background: var(--pwl-primary-light);
        color: var(--pwl-primary);
      }
      .edit-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      @media (max-width: 768px) {
        .main-content {
          grid-template-columns: 1fr;
        }
        .section-header {
          flex-direction: column;
          align-items: flex-start;
        }
        .table-header,
        .table-row {
          grid-template-columns: 1fr 45px 80px 80px 70px 70px 65px 36px;
          gap: 0;
          padding: 10px 12px;
        }
        .td,
        .th {
          padding: 0 4px;
        }
        .cell-icon {
          display: none;
        }
      }
    `,
  ],
})
export class AttendanceDashboardPageComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private dateUtils = inject(DateUtilsService);

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

    const logs = await db.getLogsByRange(this.filterStart(), this.filterEnd());
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
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to record attendance');
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
