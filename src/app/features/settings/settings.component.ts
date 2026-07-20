import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WorkLogService } from '../work-log/services/work-log.service';
import { AttendanceService } from '../attendance/services/attendance.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { AttendanceBackupData } from '../attendance/models/attendance.model';
import { WorkLog, BackupData } from '../../core/models/work-log.model';
import { formatTime, formatWorkingHoursHM } from '../../core/utils/format.utils';
import { format, subDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  private confirm = inject(ConfirmDialogService);
  private notify = inject(NotificationService);
  private attendanceService = inject(AttendanceService);
  private workLogService = inject(WorkLogService);
  private dateUtils = inject(DateUtilsService);

  previewData = signal<AttendanceBackupData | null>(null);
  private pendingData: AttendanceBackupData | null = null;

  maxDate = signal(format(new Date(), 'yyyy-MM-dd'));
  workLogStart = signal(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  workLogEnd = signal(format(new Date(), 'yyyy-MM-dd'));
  attendanceStart = signal(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  attendanceEnd = signal(format(new Date(), 'yyyy-MM-dd'));

  onWorkLogStartChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.workLogStart.set(value);
  }

  onWorkLogEndChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.workLogEnd.set(value);
  }

  onAttendanceStartChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.attendanceStart.set(value);
  }

  onAttendanceEndChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.attendanceEnd.set(value);
  }

  async downloadWorkLogExcel(): Promise<void> {
    const logs = await this.workLogService.getByRange(this.workLogStart(), this.workLogEnd());
    if (logs.length === 0) {
      this.notify.warning('No work logs found for the selected date range');
      return;
    }

    const groups: { [key: string]: WorkLog[] } = {};
    for (const log of logs) {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    }

    const rows = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .flatMap(date => {
        const dayLogs = groups[date];
        const dayName = this.dateUtils.getDayName(date);
        const totalHours = this.dateUtils.formatDuration(dayLogs.reduce((s, l) => s + l.durationMinutes, 0));
        return dayLogs.map(log => ({
          'Date': date,
          'Day': dayName,
          'Task Item': log.title,
          'Details': log.details || '',
          'Log Hours': this.dateUtils.formatDuration(log.durationMinutes),
          'Log Minutes': log.durationMinutes,
          'Total Day Hours': totalHours
        }));
      });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Logs');
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 30 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }
    ];

    const fileName = `work-logs-${this.workLogStart()}-to-${this.workLogEnd()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.notify.success(`Exported ${logs.length} work logs`);
  }

  async downloadAttendanceExcel(): Promise<void> {
    const records = await this.attendanceService.getAttendanceByDateRange(
      this.attendanceStart(), this.attendanceEnd()
    );
    if (records.length === 0) {
      this.notify.warning('No attendance records found for the selected date range');
      return;
    }

    const rows = records.map(r => ({
      'Date': r.date,
      'Day': parseISO(r.date).toLocaleDateString('en-US', { weekday: 'short' }),
      'First Punch In': r.firstPunchIn ? formatTime(r.firstPunchIn) : '--',
      'Last Punch Out': r.lastPunchOut ? formatTime(r.lastPunchOut) : '--',
      'Working Hours': formatWorkingHoursHM(r.workingMinutes),
      'Status': r.workingMinutes >= 420 ? 'Present' : r.firstPunchIn ? 'NFOH' : 'Absent'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    ws['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }
    ];

    const fileName = `attendance-${this.attendanceStart()}-to-${this.attendanceEnd()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.notify.success(`Exported ${records.length} attendance records`);
  }

  async exportData(): Promise<void> {
    try {
      const data = await this.attendanceService.exportAttendance();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklog-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const logCount = data.data?.workLogs?.length || 0;
      const attCount = data.data?.attendance?.length || 0;
      this.notify.success(`Backup exported: ${logCount} work logs, ${attCount} attendance records`);
    } catch (e) {
      console.error('Export error:', e);
      this.notify.error('Failed to export backup: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data?.data) {
          this.notify.error('Invalid backup file: missing data field');
          return;
        }
        this.pendingData = data;
        this.previewData.set(data);
      } catch (e) {
        console.error('Parse error:', e);
        this.notify.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async confirmImport(): Promise<void> {
    if (!this.pendingData) return;
    const workLogCount = this.pendingData.data.workLogs?.length || 0;
    const attendanceCount = this.pendingData.data.attendance?.length || 0;

    const ok = await this.confirm.confirm(
      'Import Data',
      `This will replace all existing data with ${workLogCount} work logs and ${attendanceCount} attendance records. Continue?`
    );
    if (ok) {
      try {
        let importedWorkLogs = 0;
        let importedAttendance = 0;

        if (workLogCount > 0) {
          importedWorkLogs = await this.workLogService.importLogs(this.pendingData as BackupData);
        }
        if (attendanceCount > 0) {
          importedAttendance = await this.attendanceService.importAttendance(this.pendingData);
        }

        this.notify.success(`Import complete: ${importedWorkLogs} work logs and ${importedAttendance} attendance records`);
        this.previewData.set(null);
        this.pendingData = null;
      } catch (e) {
        console.error('Import error:', e);
        this.notify.error('Import failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    }
  }

  async clearAll(): Promise<void> {
    const ok = await this.confirm.confirm(
      'Clear All Data',
      'This will permanently delete all your work logs and attendance records. This cannot be undone.'
    );
    if (ok) {
      try {
        await this.workLogService.clearAll();
        await this.attendanceService.clearAll();
        this.notify.success('All data cleared successfully');
      } catch (e) {
        console.error('Clear error:', e);
        this.notify.error('Failed to clear data: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
