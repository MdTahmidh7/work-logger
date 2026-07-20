import { Component, input, computed } from '@angular/core';
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
        <div class="header-left">
          <mat-icon class="header-icon">calendar_today</mat-icon>
          <span class="card-title">Today's Attendance</span>
        </div>
        <div class="status-badge" [class]="statusClass()">
          {{ statusLabel() }}
        </div>
      </div>

      <div class="card-body">
        <div class="info-row">
          <div class="info-item">
            <div class="info-icon punch-in-icon-bg">
              <mat-icon>login</mat-icon>
            </div>
            <span class="info-label">First Punch In</span>
            <span class="info-value punch-in-color">
              @if (attendance()) {
                {{ formatTime(attendance()!.firstPunchIn) }}
              } @else {
                --
              }
            </span>
          </div>
          <div class="info-divider"></div>
          <div class="info-item">
            <div class="info-icon punch-out-icon-bg">
              <mat-icon>logout</mat-icon>
            </div>
            <span class="info-label">Last Punch Out</span>
            <span class="info-value punch-out-color">
              @if (attendance()?.lastPunchOut) {
                {{ formatTime(attendance()!.lastPunchOut!) }}
              } @else {
                --
              }
            </span>
          </div>
          <div class="info-divider"></div>
          <div class="info-item">
            <div class="info-icon working-icon-bg">
              <mat-icon>schedule</mat-icon>
            </div>
            <span class="info-label">Working Hour</span>
            <span class="info-value working-color">{{ workingHours() }}</span>
          </div>
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
      height: 100%;
      width: 100%;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pwl-divider);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pwl-primary);
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

    .status-badge.Absent {
      background: rgba(156, 163, 175, 0.15);
      color: #6b7280;
    }

    .status-badge.Working {
      background: rgba(13, 148, 136, 0.15);
      color: #0d9488;
    }

    .status-badge.Present {
      background: rgba(13, 148, 136, 0.15);
      color: #0d9488;
    }

    .status-badge.NFOH {
      background: rgba(217, 119, 6, 0.15);
      color: #d97706;
    }

    .card-body {
      padding: 20px;
    }

    .info-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      gap: 0;
      align-items: center;
    }

    .info-divider {
      width: 1px;
      height: 48px;
      background: var(--pwl-divider);
      margin: 0 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
    }

    .info-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }

    .info-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .punch-in-icon-bg {
      background: rgba(13, 148, 136, 0.1);
      color: #0d9488;
    }

    .punch-out-icon-bg {
      background: rgba(220, 38, 38, 0.1);
      color: #dc2626;
    }

    .working-icon-bg {
      background: rgba(103, 80, 164, 0.1);
      color: #6750a4;
    }

    .info-label {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
    }

    .info-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--pwl-text-primary);
    }

    .info-value.punch-in-color { color: #0d9488; }
    .info-value.punch-out-color { color: #dc2626; }
    .info-value.working-color { color: #6750a4; }
  `]
})
export class TodayAttendanceCardComponent {
  attendance = input<Attendance | null>(null);

  statusClass = computed(() => {
    const att = this.attendance();
    if (!att) return 'Absent';
    if (att.workingMinutes >= 420) return 'Present';
    return 'NFOH';
  });

  statusLabel = computed(() => {
    const att = this.attendance();
    if (!att) return 'Not Started';
    if (att.status === 'working') return 'Working';
    if (att.workingMinutes >= 420) return 'Present';
    return 'NFOH';
  });

  workingHours = computed(() => {
    const att = this.attendance();
    if (!att) return '00:00';
    const minutes = att.workingMinutes;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }
}
