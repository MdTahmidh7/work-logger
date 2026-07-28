import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Attendance } from '../models/attendance.model';
import { formatTime, formatWorkingHoursColon } from '../../../core/utils/format.utils';

@Component({
  standalone: true,
  selector: 'app-today-attendance-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './today-attendance-card.component.html',
  styleUrls: ['./today-attendance-card.component.scss']
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
    return formatWorkingHoursColon(att.workingMinutes);
  });

  formatTime = formatTime;
}
