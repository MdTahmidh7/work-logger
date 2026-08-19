import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Attendance } from '../models/attendance.model';
import { formatTime, formatWorkingHoursColon } from '../../../core/utils/format.utils';
import { subDays, format } from 'date-fns';

interface MiniHistoryRow {
  date: string;
  dateLabel: string;
  dayName: string;
  status: string;
  attendance: Attendance | null;
  isToday: boolean;
  showTimes: boolean;
}

@Component({
  standalone: true,
  selector: 'app-attendance-mini-history',
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './attendance-mini-history.component.html',
  styleUrls: ['./attendance-mini-history.component.scss']
})
export class AttendanceMiniHistoryComponent {
  records = input<Attendance[]>([]);

  rows = computed<MiniHistoryRow[]>(() => {
    const map = new Map<string, Attendance>();
    for (const att of this.records()) {
      const existing = map.get(att.date);
      if (!existing || att.updatedAt > existing.updatedAt) {
        map.set(att.date, att);
      }
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const result: MiniHistoryRow[] = [];

    for (let i = 0; i < 7; i++) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const attendance = map.get(dateStr) || null;
      const day = d.getDay();
      const type = attendance?.dayType;
      const isWeekend = day === 5 || day === 6;

      let status: string;
      if (type === 'holiday') status = 'Holiday';
      else if (type === 'leave') status = 'Leave';
      else if (isWeekend) status = 'Weekend';
      else if (!attendance) status = 'Absent';
      else if (attendance.workingMinutes >= 420) status = 'Present';
      else if (attendance.workingMinutes > 0) status = 'NFOH';
      else status = 'Absent';

      const month = d.toLocaleDateString('en-US', { month: 'short' });
      result.push({
        date: dateStr,
        dateLabel: `${d.getDate()} ${month}, ${String(d.getFullYear()).slice(-2)}`,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        status,
        attendance,
        isToday: dateStr === todayStr,
        showTimes: status === 'Present' || status === 'NFOH'
      });
    }

    return result;
  });

  statusIcon(status: string): string {
    switch (status) {
      case 'Present': return 'check_circle';
      case 'NFOH': return 'schedule';
      case 'Holiday': return 'celebration';
      case 'Leave': return 'beach_access';
      case 'Weekend': return 'weekend';
      default: return 'person_off';
    }
  }

  statusTooltip(status: string): string {
    switch (status) {
      case 'Present': return 'Present';
      case 'NFOH': return 'NFOH';
      case 'Holiday': return 'Holiday';
      case 'Leave': return 'Leave';
      case 'Weekend': return 'Weekend';
      default: return 'Absent';
    }
  }

  formatTime = formatTime;
  formatWorkingHours = formatWorkingHoursColon;
}
