import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { db } from '../../core/database/database.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { BackupData } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Manage your data and preferences</p>
      </div>

      <div class="settings-sections">
        <div class="section-card">
          <div class="section-icon" style="background: rgba(0,122,255,0.1);">
            <mat-icon style="color: var(--pwl-primary);">backup</mat-icon>
          </div>
          <div class="section-content">
            <h3>Export Data</h3>
            <p>Download all your work logs as a JSON backup file.</p>
            <button mat-raised-button color="primary" (click)="exportData()">
              <mat-icon>download</mat-icon> Export Backup
            </button>
          </div>
        </div>

        <div class="section-card">
          <div class="section-icon" style="background: rgba(52,199,89,0.1);">
            <mat-icon style="color: var(--pwl-success);">restore</mat-icon>
          </div>
          <div class="section-content">
            <h3>Import Data</h3>
            <p>Restore work logs from a previously exported backup file.</p>
            <input type="file" #fileInput accept=".json" (change)="onFileSelected($event)" style="display:none">
            <button mat-raised-button color="primary" (click)="fileInput.click()">
              <mat-icon>upload</mat-icon> Import Backup
            </button>
            @if (previewData()) {
              <div class="preview-card">
                <h4>Preview</h4>
                <div class="preview-stats">
                  <span>{{ previewData()!.data.workLogs.length }} work logs</span>
                  <span>Exported: {{ formatDate(previewData()!.exportedAt) }}</span>
                  <span>App version: {{ previewData()!.version }}</span>
                </div>
                <div class="preview-actions">
                  <button mat-stroked-button (click)="previewData.set(null)">Cancel</button>
                  <button mat-raised-button color="primary" (click)="confirmImport()">Confirm Import</button>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="section-card danger">
          <div class="section-icon" style="background: rgba(255,59,48,0.1);">
            <mat-icon style="color: var(--pwl-danger);">delete_forever</mat-icon>
          </div>
          <div class="section-content">
            <h3>Clear All Data</h3>
            <p>Permanently delete all work logs. This action cannot be undone.</p>
            <button mat-stroked-button (click)="clearAll()" style="color:var(--pwl-danger);border-color:var(--pwl-danger);">
              <mat-icon>delete</mat-icon> Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 700px; margin: 0 auto; padding-top: 90px; padding-left: 20px; padding-right: 20px; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 28px; font-weight: 700; }
    .subtitle { color: var(--pwl-text-secondary); font-size: 15px; margin-top: 4px; }

    .settings-sections { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      display: flex; gap: 20px; padding: 24px;
      background: var(--pwl-surface); border-radius: 16px; border: 1px solid var(--pwl-divider);
      transition: all 0.2s;
    }
    .section-card:hover { box-shadow: none; }

    .section-icon {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .section-content { flex: 1; }
    .section-content h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .section-content p { color: var(--pwl-text-secondary); font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
    .section-content button { display: inline-flex; align-items: center; gap: 6px; }

    .preview-card {
      margin-top: 16px; padding: 16px; background: var(--pwl-surface-variant);
      border-radius: 12px; border: 1px solid var(--pwl-divider);
    }
    .preview-card h4 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .preview-stats { display: flex; gap: 16px; font-size: 13px; color: var(--pwl-text-secondary); margin-bottom: 12px; }
    .preview-actions { display: flex; gap: 8px; }
  `]
})
export class SettingsComponent {
  private confirm = inject(ConfirmDialogService);
  private notify = inject(NotificationService);

  previewData = signal<BackupData | null>(null);
  private pendingData: BackupData | null = null;

  async exportData(): Promise<void> {
    try {
      const data = await db.exportLogs();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-log-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        const data = JSON.parse(reader.result as string) as BackupData;
        if (!data.data?.workLogs) {
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
    const ok = await this.confirm.confirm(
      'Import Data',
      `This will replace all existing data with ${this.pendingData.data.workLogs.length} work logs. Continue?`
    );
    if (ok) {
      try {
        await db.importLogs(this.pendingData);
        this.notify.success(`Imported ${this.pendingData.data.workLogs.length} work logs`);
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
      'This will permanently delete all your work logs. This cannot be undone.'
    );
    if (ok) {
      await db.clearAll();
      this.notify.success('All data cleared');
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}
