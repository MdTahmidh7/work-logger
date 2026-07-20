import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { db } from '../../core/database/database.service';
import { AttendanceService } from '../attendance/services/attendance.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { AttendanceBackupData } from '../attendance/models/attendance.model';
import { WorkLog } from '../../core/models/work-log.model';
import { format, subDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="settings-wrapper">
      <div class="settings">
        <div class="page-header">
          <h1>Settings</h1>
          <p class="subtitle">Manage your data, exports, and preferences</p>
        </div>

        <div class="section-label">
          <mat-icon>download</mat-icon>
          <span>Export to Excel</span>
        </div>

        <div class="settings-grid">
          <div class="setting-card">
            <div class="card-icon work-icon">
              <mat-icon>table_chart</mat-icon>
            </div>
            <div class="card-content">
              <h3>Export Work Logs</h3>
              <p>Download work logs as Excel file for the selected date range.</p>
              <div class="download-row">
                <div class="date-input-group">
                  <label>From</label>
                  <input type="date" [value]="workLogStart()" [max]="workLogEnd()" (change)="onWorkLogStartChange($event)">
                </div>
                <div class="date-input-group">
                  <label>To</label>
                  <input type="date" [value]="workLogEnd()" [max]="maxDate()" (change)="onWorkLogEndChange($event)">
                </div>
                <button class="action-btn export-work-btn" (click)="downloadWorkLogExcel()">
                  <mat-icon>download</mat-icon>
                  Download
                </button>
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="card-icon att-icon">
              <mat-icon>event_note</mat-icon>
            </div>
            <div class="card-content">
              <h3>Export Attendance</h3>
              <p>Download attendance records as Excel file for the selected date range.</p>
              <div class="download-row">
                <div class="date-input-group">
                  <label>From</label>
                  <input type="date" [value]="attendanceStart()" [max]="attendanceEnd()" (change)="onAttendanceStartChange($event)">
                </div>
                <div class="date-input-group">
                  <label>To</label>
                  <input type="date" [value]="attendanceEnd()" [max]="maxDate()" (change)="onAttendanceEndChange($event)">
                </div>
                <button class="action-btn export-att-btn" (click)="downloadAttendanceExcel()">
                  <mat-icon>download</mat-icon>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="section-label">
          <mat-icon>sync</mat-icon>
          <span>Backup & Restore</span>
        </div>

        <div class="settings-grid">
          <div class="setting-card">
            <div class="card-icon export-icon">
              <mat-icon>cloud_upload</mat-icon>
            </div>
            <div class="card-content">
              <h3>Export JSON Backup</h3>
              <p>Download all your work logs and attendance records as a JSON backup file.</p>
              <button class="action-btn backup-btn" (click)="exportData()">
                <mat-icon>download</mat-icon>
                Export Data
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="card-icon import-icon">
              <mat-icon>cloud_download</mat-icon>
            </div>
            <div class="card-content">
              <h3>Import JSON Backup</h3>
              <p>Restore work logs and attendance from a previously exported backup file.</p>
              <input type="file" #fileInput accept=".json" (change)="onFileSelected($event)" style="display:none">
              <button class="action-btn import-btn" (click)="fileInput.click()">
                <mat-icon>upload</mat-icon>
                Import Data
              </button>
            </div>
          </div>
        </div>

        @if (previewData()) {
          <div class="preview-section">
            <div class="preview-header">
              <mat-icon>info</mat-icon>
              <span>Backup Preview</span>
            </div>
            <div class="preview-body">
              <div class="preview-grid">
                <div class="preview-stat">
                  <span class="stat-num">{{ previewData()!.data.workLogs.length }}</span>
                  <span class="stat-desc">Work Logs</span>
                </div>
                <div class="preview-stat">
                  <span class="stat-num">{{ previewData()!.data.attendance.length }}</span>
                  <span class="stat-desc">Attendance Records</span>
                </div>
                <div class="preview-stat">
                  <span class="stat-num">{{ previewData()!.version }}</span>
                  <span class="stat-desc">Version</span>
                </div>
                <div class="preview-stat">
                  <span class="stat-num">{{ formatDate(previewData()!.exportedAt) }}</span>
                  <span class="stat-desc">Exported</span>
                </div>
              </div>
              <div class="preview-actions">
                <button class="action-btn cancel-btn" (click)="previewData.set(null)">
                  Cancel
                </button>
                <button class="action-btn confirm-btn" (click)="confirmImport()">
                  <mat-icon>check</mat-icon>
                  Confirm Import
                </button>
              </div>
            </div>
          </div>
        }

        <div class="danger-zone">
          <div class="danger-header">
            <div class="card-icon danger-icon">
              <mat-icon>warning</mat-icon>
            </div>
            <div>
              <h3>Danger Zone</h3>
              <p>Irreversible actions that permanently delete your data.</p>
            </div>
          </div>
          <div class="danger-content">
            <div class="danger-item">
              <div class="danger-info">
                <mat-icon>delete_sweep</mat-icon>
                <div>
                  <span class="danger-title">Clear All Data</span>
                  <span class="danger-desc">Permanently delete all work logs and attendance records.</span>
                </div>
              </div>
              <button class="action-btn danger-btn" (click)="clearAll()">
                <mat-icon>delete_forever</mat-icon>
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-wrapper {
      max-width: 60%;
      margin: auto;
      padding: 20px;
    }

    .settings { padding-top: 82px; }

    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); margin: 0; }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--pwl-text-primary);
      margin-bottom: 12px;
      margin-top: 8px;
    }

    .section-label mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pwl-primary);
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .setting-card {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 20px;
      display: flex;
      gap: 16px;
      transition: all 0.2s;
    }

    .setting-card:hover {
      border-color: var(--pwl-primary);
    }

    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .work-icon { background: rgba(103, 80, 164, 0.1); color: #6750a4; }
    .att-icon { background: rgba(13, 148, 136, 0.1); color: #0d9488; }
    .export-icon { background: rgba(13, 148, 136, 0.1); color: #0d9488; }
    .import-icon { background: rgba(103, 80, 164, 0.1); color: #6750a4; }

    .card-content { flex: 1; min-width: 0; }
    .card-content h3 { font-size: 15px; font-weight: 600; color: var(--pwl-text-primary); margin: 0 0 4px 0; }
    .card-content p { font-size: 12px; color: var(--pwl-text-secondary); line-height: 1.4; margin: 0 0 12px 0; }

    .download-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .date-input-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      min-width: 0;
    }

    .date-input-group label {
      font-size: 10px;
      font-weight: 500;
      color: var(--pwl-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .date-input-group input {
      padding: 7px 8px;
      border-radius: 8px;
      border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface-variant);
      font-size: 11px;
      font-family: 'Inter', sans-serif;
      color: var(--pwl-text-primary);
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }

    .date-input-group input:focus {
      border-color: var(--pwl-primary);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 14px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s;
      white-space: nowrap;
      height: 34px;
    }

    .action-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .export-work-btn {
      background: #6750a4;
      color: white;
    }
    .export-work-btn:hover {
      background: #5b42a0;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(103, 80, 164, 0.3);
    }

    .export-att-btn {
      background: #0d9488;
      color: white;
    }
    .export-att-btn:hover {
      background: #0f766e;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(13, 148, 136, 0.3);
    }

    .backup-btn {
      background: #0d9488;
      color: white;
    }
    .backup-btn:hover {
      background: #0f766e;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(13, 148, 136, 0.3);
    }

    .import-btn {
      background: #6750a4;
      color: white;
    }
    .import-btn:hover {
      background: #5b42a0;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(103, 80, 164, 0.3);
    }

    .preview-section {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      overflow: hidden;
      margin-bottom: 24px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      background: rgba(103, 80, 164, 0.04);
      font-size: 14px;
      font-weight: 600;
      color: var(--pwl-text-primary);
    }

    .preview-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6750a4; }

    .preview-body { padding: 16px 20px; }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .preview-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 10px;
      background: var(--pwl-surface-variant);
      border-radius: 10px;
    }

    .stat-num { font-size: 16px; font-weight: 700; color: var(--pwl-text-primary); }
    .stat-desc { font-size: 10px; color: var(--pwl-text-secondary); font-weight: 500; }

    .preview-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .cancel-btn {
      background: var(--pwl-surface-variant);
      color: var(--pwl-text-secondary);
      border: 1px solid var(--pwl-divider);
    }
    .cancel-btn:hover { background: var(--pwl-divider); }

    .confirm-btn {
      background: #6750a4;
      color: white;
    }
    .confirm-btn:hover {
      background: #5b42a0;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(103, 80, 164, 0.3);
    }

    .danger-zone {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid rgba(220, 38, 38, 0.2);
      overflow: hidden;
    }

    .danger-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(220, 38, 38, 0.1);
    }

    .danger-icon { background: rgba(220, 38, 38, 0.1); color: #dc2626; }

    .danger-header h3 { font-size: 15px; font-weight: 600; color: var(--pwl-text-primary); margin: 0; }
    .danger-header p { font-size: 12px; color: var(--pwl-text-secondary); margin: 2px 0 0 0; }

    .danger-content { padding: 16px 24px; }

    .danger-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .danger-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .danger-info mat-icon { font-size: 20px; width: 20px; height: 20px; color: #dc2626; }

    .danger-title { font-size: 14px; font-weight: 600; color: var(--pwl-text-primary); display: block; }
    .danger-desc { font-size: 12px; color: var(--pwl-text-secondary); display: block; margin-top: 1px; }

    .danger-btn {
      background: rgba(220, 38, 38, 0.08);
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.2);
      flex-shrink: 0;
    }
    .danger-btn:hover {
      background: #dc2626;
      color: white;
      border-color: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    @media (max-width: 768px) {
      .settings-grid { grid-template-columns: 1fr; }
      .download-row { flex-direction: column; align-items: stretch; }
      .action-btn { justify-content: center; }
      .preview-grid { grid-template-columns: repeat(2, 1fr); }
      .danger-item { flex-direction: column; align-items: stretch; }
      .danger-btn { justify-content: center; }
    }
  `]
})
export class SettingsComponent {
  private confirm = inject(ConfirmDialogService);
  private notify = inject(NotificationService);
  private attendanceService = inject(AttendanceService);
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
    const logs = await db.getLogsByRange(this.workLogStart(), this.workLogEnd());
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
      'First Punch In': r.firstPunchIn ? this.formatTime(r.firstPunchIn) : '--',
      'Last Punch Out': r.lastPunchOut ? this.formatTime(r.lastPunchOut) : '--',
      'Working Hours': this.formatWorkingHours(r.workingMinutes),
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
      this.notify.success('Backup exported successfully');
    } catch {
      this.notify.error('Failed to export backup');
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AttendanceBackupData;
        if (!data.data?.workLogs && !data.data?.attendance) {
          this.notify.error('Invalid backup file format');
          return;
        }
        this.pendingData = data;
        this.previewData.set(data);
      } catch {
        this.notify.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
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
        if (this.pendingData.data.workLogs) {
          await db.importLogs({ ...this.pendingData, data: { workLogs: this.pendingData.data.workLogs } } as any);
        }
        if (this.pendingData.data.attendance) {
          await this.attendanceService.importAttendance(this.pendingData);
        }
        this.notify.success(`Imported ${workLogCount} work logs and ${attendanceCount} attendance records`);
        this.previewData.set(null);
        this.pendingData = null;
      } catch {
        this.notify.error('Failed to import data');
      }
    }
  }

  async clearAll(): Promise<void> {
    const ok = await this.confirm.confirm(
      'Clear All Data',
      'This will permanently delete all your work logs and attendance records. This cannot be undone.'
    );
    if (ok) {
      await db.clearAll();
      this.notify.success('All data cleared');
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  formatWorkingHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }
}
