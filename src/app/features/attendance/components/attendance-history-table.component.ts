import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attendance } from '../models/attendance.model';

@Component({
  standalone: true,
  selector: 'app-attendance-history-table',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="history-table">
      <div class="table-header">
        <div class="th">Date</div>
        <div class="th">Day</div>
        <div class="th">First Punch In</div>
        <div class="th">Last Punch Out</div>
        <div class="th">Working Hour</div>
        <div class="th">Status</div>
      </div>
      @for (record of records(); track record.id) {
        <div class="table-row"
             [class.workday]="!isWeekend(record.date)"
             [class.friday]="isFriday(record.date)"
             [class.saturday]="isSaturday(record.date)">
          <div class="td">{{ formatDate(record.date) }}</div>
          <div class="td day-cell" [class.holiday]="isFriday(record.date) || isSaturday(record.date)">
            {{ getDayName(record.date) }}
          </div>
          <div class="td punch-cell">{{ formatTime(record.firstPunchIn) }}</div>
          <div class="td punch-cell">
            @if (record.lastPunchOut) {
              {{ formatTime(record.lastPunchOut) }}
            } @else {
              --
            }
          </div>
          <div class="td hours-cell">
            <span class="hours-badge" [class.friday-badge]="isFriday(record.date)" [class.saturday-badge]="isSaturday(record.date)">
              {{ formatWorkingHours(record.workingMinutes) }}
            </span>
          </div>
          <div class="td">
            <span class="status-badge" [class]="record.status">
              {{ formatStatus(record.status) }}
            </span>
          </div>
        </div>
      } @empty {
        <div class="empty-state">
          <mat-icon>event_busy</mat-icon>
          <h3>No attendance records</h3>
          <p>No attendance data for this period.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .history-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 100px 90px 100px 100px 100px 100px;
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
      grid-template-columns: 100px 90px 100px 100px 100px 100px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.2s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.workday { background: rgba(13, 148, 136, 0.04); }
    .table-row.workday:hover { background: rgba(13, 148, 136, 0.08); }
    .table-row.friday { background: rgba(255, 204, 0, 0.12); }
    .table-row.friday:hover { background: rgba(255, 204, 0, 0.18); }
    .table-row.saturday { background: rgba(255, 107, 107, 0.12); }
    .table-row.saturday:hover { background: rgba(255, 107, 107, 0.18); }

    .td { font-size: 13px; color: var(--pwl-text-primary); }

    .day-cell { color: var(--pwl-text-secondary); font-size: 12px; }
    .day-cell.holiday { font-weight: 600; }

    .punch-cell { font-weight: 500; }

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
    .status-badge.not_started { background: rgba(156, 163, 175, 0.15); color: #6b7280; }
    .status-badge.working { background: rgba(13, 148, 136, 0.15); color: #0d9488; }
    .status-badge.completed { background: rgba(34, 197, 94, 0.15); color: #16a34a; }

    .empty-state {
      text-align: center; padding: 40px 20px;
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider);
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--pwl-text-tertiary); margin-bottom: 10px; }
    .empty-state h3 { font-size: 14px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 4px; }
    .empty-state p { color: var(--pwl-text-secondary); font-size: 13px; }

    @media (max-width: 768px) {
      .table-header, .table-row {
        grid-template-columns: 80px 70px 90px 90px 90px 90px;
        padding: 8px 14px;
        font-size: 11px;
      }
    }
  `]
})
export class AttendanceHistoryTableComponent {
  records = input.required<Attendance[]>();

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getDayName(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
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
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ');
  }

  isWeekend(date: string): boolean {
    const day = new Date(date).getDay();
    return day === 0 || day === 5 || day === 6;
  }

  isFriday(date: string): boolean {
    return new Date(date).getDay() === 5;
  }

  isSaturday(date: string): boolean {
    return new Date(date).getDay() === 6;
  }
}