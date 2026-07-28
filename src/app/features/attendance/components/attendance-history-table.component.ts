import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attendance } from '../models/attendance.model';
import { formatTime, formatWorkingHoursHM, isWeekend, isFriday, isSaturday } from '../../../core/utils/format.utils';

@Component({
  standalone: true,
  selector: 'app-attendance-history-table',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './attendance-history-table.component.html',
  styleUrls: ['./attendance-history-table.component.scss']
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

  formatTime = formatTime;

  formatWorkingHours = formatWorkingHoursHM;

  formatStatus(status: string): string {
    return status.replace('_', ' ');
  }

  isWeekend = isWeekend;

  isFriday = isFriday;

  isSaturday = isSaturday;
}