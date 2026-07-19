import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Attendance } from '../models/attendance.model';

@Component({
  standalone: true,
  selector: 'app-today-attendance-card',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="today-card">
      <div class="card-header">
        <div class="card-title">Today's Attendance</div>
        <div class="status-badge" [class]="statusClass()">
          {{ statusLabel() }}
        </div>
      </div>

      <div class="card-body">
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">First Punch In</span>
            <span class="info-value">
              @if (attendance()) {
                {{ formatTime(attendance()!.firstPunchIn) }}
              } @else {
                --
              }
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Punch Out</span>
            <span class="info-value">
              @if (attendance()?.lastPunchOut) {
                {{ formatTime(attendance()!.lastPunchOut!) }}
              } @else {
                --
              }
            </span>
          </div>
        </div>

        <div class="working-hours">
          <span class="hours-label">Working Hour</span>
          <span class="hours-value">{{ workingHours() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .today-card {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pwl-divider);
    }

    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--pwl-text-primary);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.not_started {
      background: rgba(156, 163, 175, 0.15);
      color: #6b7280;
    }

    .status-badge.working {
      background: rgba(13, 148, 136, 0.15);
      color: #0d9488;
    }

    .status-badge.completed {
      background: rgba(34, 197, 94, 0.15);
      color: #16a34a;
    }

    .card-body {
      padding: 20px;
    }

    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
    }

    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--pwl-text-primary);
    }

    .working-hours {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--pwl-primary-light);
      border-radius: 10px;
    }

    .hours-label {
      font-size: 13px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
    }

    .hours-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--pwl-primary);
    }
  `]
})
export class TodayAttendanceCardComponent {
  attendance = input<Attendance | null>(null);

  statusClass = (): string => {
    if (!this.attendance()) return 'not_started';
    return this.attendance()!.status;
  };

  statusLabel = (): string => {
    if (!this.attendance()) return 'Not Started';
    if (this.attendance()!.status === 'working') return 'Working';
    return 'Completed';
  };

  workingHours = (): string => {
    if (!this.attendance()) return '00h 00m';
    const minutes = this.attendance()!.workingMinutes;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }
}