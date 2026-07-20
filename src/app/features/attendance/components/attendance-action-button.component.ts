import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attendance } from '../models/attendance.model';
import { formatTime } from '../../../core/utils/format.utils';

@Component({
  standalone: true,
  selector: 'app-attendance-action-button',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './attendance-action-button.component.html',
  styleUrls: ['./attendance-action-button.component.scss']
})
export class AttendanceActionButtonComponent {
  attendance = input<Attendance | null>(null);
  action = output<void>();

  formatTime = formatTime;

  formatDate(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
