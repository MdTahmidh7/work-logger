import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attendance } from '../models/attendance.model';

@Component({
  standalone: true,
  selector: 'app-attendance-action-button',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="action-content">
      <div class="action-top">
        <div class="icon-circle" [class.punch-in-circle]="!attendance()" [class.punch-out-circle]="!!attendance()">
          <mat-icon>{{ attendance() ? 'logout' : 'login' }}</mat-icon>
        </div>
        <div class="action-info">
          @if (attendance()?.lastPunchOut) {
            <span class="info-label">Last Punch Out</span>
            <span class="info-time">{{ formatTime(attendance()!.lastPunchOut!) }}</span>
            <span class="info-date">{{ formatDate() }}</span>
          } @else if (attendance()) {
            <span class="info-label">Last Punch In</span>
            <span class="info-time">{{ formatTime(attendance()!.firstPunchIn) }}</span>
            <span class="info-date">{{ formatDate() }}</span>
          } @else {
            <span class="info-label">No attendance today</span>
            <span class="info-time">--</span>
            <span class="info-date">{{ formatDate() }}</span>
          }
        </div>
      </div>
      <button class="action-btn" [class.punch-in]="!attendance()" [class.punch-out]="!!attendance()"
              (click)="action.emit()">
        <mat-icon>fingerprint</mat-icon>
        <span>{{ attendance() ? 'Punch Out' : 'Punch In' }}</span>
      </button>
    </div>
  `,
  styles: [`
    .action-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
      justify-content: center;
    }

    .action-top {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: center;
    }

    .icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon-circle.punch-in-circle {
      background: rgba(13, 148, 136, 0.12);
      color: #0d9488;
    }

    .icon-circle.punch-out-circle {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
    }

    .icon-circle mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .action-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
    }

    .info-time {
      font-size: 22px;
      font-weight: 700;
      color: var(--pwl-text-primary);
      line-height: 1.2;
    }

    .info-date {
      font-size: 12px;
      color: var(--pwl-text-tertiary);
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Inter', sans-serif;
      color: white;
    }

    .action-btn.punch-in {
      background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
      box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);
    }

    .action-btn.punch-in:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
    }

    .action-btn.punch-out {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    }

    .action-btn.punch-out:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
    }

    .action-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `]
})
export class AttendanceActionButtonComponent {
  attendance = input<Attendance | null>(null);
  action = output<void>();

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  formatDate(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
