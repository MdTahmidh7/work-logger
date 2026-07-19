import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attendance } from '../models/attendance.model';

@Component({
  standalone: true,
  selector: 'app-attendance-action-button',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="action-container">
      <button class="action-btn" [class.punch-in]="!attendance()" [class.punch-out]="!!attendance()"
              (click)="action.emit()">
        <mat-icon>{{ attendance() ? 'logout' : 'login' }}</mat-icon>
        <span>{{ attendance() ? 'Punch Out' : 'Punch In' }}</span>
      </button>
      <div class="subtitle">
        @if (!attendance()) {
          <span>No attendance today</span>
        } @else if (attendance()!.lastPunchOut) {
          <span>Last Punch Out: <strong>{{ formatTime(attendance()!.lastPunchOut!) }}</strong></span>
        } @else {
          <span>Last Punch In: <strong>{{ formatTime(attendance()!.firstPunchIn) }}</strong></span>
        }
      </div>
    </div>
  `,
  styles: [`
    .action-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 32px;
      border-radius: 16px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Inter', sans-serif;
    }

    .action-btn.punch-in {
      background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);
    }

    .action-btn.punch-in:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
    }

    .action-btn.punch-out {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    }

    .action-btn.punch-out:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
    }

    .action-btn mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .subtitle {
      font-size: 13px;
      color: var(--pwl-text-secondary);
    }

    .subtitle strong {
      color: var(--pwl-text-primary);
      font-weight: 600;
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
}