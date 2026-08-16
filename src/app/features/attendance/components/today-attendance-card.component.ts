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
    if (att.dayType === 'holiday') return 'Holiday';
    if (att.dayType === 'leave') return 'Leave';
    if (att.workingMinutes >= 420) return 'Present';
    if (att.workingMinutes > 0) return 'NFOH';
    return 'Absent';
  });

  statusLabel = computed(() => {
    const att = this.attendance();
    if (!att) return 'Not Started';
    if (att.dayType === 'holiday') return 'Holiday';
    if (att.dayType === 'leave') return 'Leave';
    if (att.status === 'working') return 'Working';
    if (att.workingMinutes >= 420) return 'Present';
    if (att.workingMinutes > 0) return 'NFOH';
    return 'Absent';
  });

  workingHours = computed(() => {
    const att = this.attendance();
    if (!att) return '00:00';
    return formatWorkingHoursColon(att.workingMinutes);
  });

  formatTime = formatTime;
}
