import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { WorkLogListComponent } from '../../shared/components/work-log-list.component';
import { db } from '../../core/database/database.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-list-page',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, DateFilterComponent, WorkLogListComponent],
  template: `
    <div class="list-page">
      <div class="page-header">
        <div>
          <h1>Work Logs</h1>
          <p class="subtitle">{{ filteredLogs().length }} entries</p>
        </div>
        <a routerLink="/work-log" class="add-btn">
          <mat-icon>add</mat-icon> Add Log
        </a>
      </div>

      <app-date-filter (rangeChange)="onFilterChange($event)" />

      <div class="log-list">
        @for (group of groupedLogs(); track group.date) {
          <div class="date-group" [class.friday]="group.isFriday" [class.saturday]="group.isSaturday">
            <div class="date-header">
              <div class="date-info">
                <span class="day-name">{{ group.dayName }}</span>
                <span class="date-text">{{ group.formattedDate }}</span>
              </div>
              <div class="date-summary">
                <span class="total-hours">{{ group.totalHours }}h</span>
                <span class="total-count">{{ group.logs.length }} tasks</span>
              </div>
            </div>
            <div class="log-entries">
              @for (log of group.logs; track log.id) {
                <div class="log-entry">
                  <div class="log-main">
                    <div class="log-title">{{ log.title }}</div>
                    @if (log.details) {
                      <div class="log-details">{{ log.details }}</div>
                    }
                  </div>
                  <div class="log-meta">
                    <span class="duration">{{ formatDuration(log.durationMinutes) }}</span>
                    <div class="log-actions">
                      <a [routerLink]="['/edit', log.id]" mat-icon-button class="action-btn">
                        <mat-icon>edit</mat-icon>
                      </a>
                      <button mat-icon-button class="action-btn delete-btn" (click)="deleteLog(log.id!)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>work_off</mat-icon>
            <h3>No logs found</h3>
            <p>No work logs for this period. Add your first entry!</p>
            <a routerLink="/work-log" class="add-btn"><mat-icon>add</mat-icon> Add Work Log</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .list-page { padding-top: 90px; max-width: 1100px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 700; }
    .subtitle { color: var(--pwl-text-secondary); font-size: 15px; margin-top: 4px; }
    .add-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 12px 24px;
      border-radius: 12px; background: var(--pwl-primary); color: white;
      font-weight: 600; text-decoration: none; transition: all 0.2s;
    }
    .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

    .log-list { display: flex; flex-direction: column; gap: 24px; }

    .date-group {
      background: var(--pwl-surface); border-radius: 16px; border: 1px solid var(--pwl-divider); overflow: hidden;
    }
    .date-group.friday { border-left: 4px solid #ffcc00; }
    .date-group.saturday { border-left: 4px solid #ff6b6b; }

    .date-header {
      padding: 16px 24px; background: var(--pwl-surface-variant);
      display: flex; justify-content: space-between; align-items: center;
    }
    .date-info { display: flex; flex-direction: column; }
    .day-name { font-size: 16px; font-weight: 700; color: var(--pwl-text-primary); }
    .date-text { font-size: 13px; color: var(--pwl-text-secondary); }
    .date-summary { text-align: right; }
    .total-hours { font-size: 18px; font-weight: 700; color: var(--pwl-primary); display: block; }
    .total-count { font-size: 12px; color: var(--pwl-text-secondary); }

    .log-entries { padding: 8px 16px; }

    .log-entry {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 12px; border-radius: 10px; transition: background 0.2s;
    }
    .log-entry:hover { background: var(--pwl-surface-variant); }

    .log-main { flex: 1; min-width: 0; }
    .log-title { font-size: 15px; font-weight: 600; color: var(--pwl-text-primary); }
    .log-details { font-size: 13px; color: var(--pwl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .log-meta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .duration {
      font-size: 14px; font-weight: 600; color: var(--pwl-primary);
      background: var(--pwl-primary-light); padding: 4px 10px; border-radius: 8px;
    }
    .log-actions { display: flex; gap: 2px; }
    .action-btn { width: 34px; height: 34px; color: var(--pwl-text-secondary); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .empty-state {
      text-align: center; padding: 60px 20px;
      background: var(--pwl-surface); border-radius: 16px; border: 1px solid var(--pwl-divider);
    }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--pwl-text-tertiary); margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    .empty-state p { color: var(--pwl-text-secondary); margin-bottom: 24px; }

    @media (max-width: 600px) {
      .page-header { flex-direction: column; gap: 16px; }
      .log-entry { flex-direction: column; align-items: flex-start; gap: 10px; }
      .log-meta { width: 100%; justify-content: space-between; }
    }
  `]
})
export class WorkLogListPageComponent implements OnInit {
  private dateUtils = inject(DateUtilsService);
  private confirm = inject(ConfirmDialogService);
  private notify = inject(NotificationService);

  filteredLogs = signal<WorkLog[]>([]);

  groupedLogs = computed(() => {
    const logs = this.filteredLogs();
    const groups: { [key: string]: WorkLog[] } = {};
    for (const log of logs) {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        logs: groups[date],
        dayName: this.dateUtils.getDayName(date),
        formattedDate: this.dateUtils.formatDate(date),
        totalHours: (groups[date].reduce((s, l) => s + l.durationMinutes, 0) / 60).toFixed(1),
        isFriday: this.dateUtils.isFriday(date),
        isSaturday: this.dateUtils.isSaturday(date)
      }));
  });

  async ngOnInit(): Promise<void> {
    const range = this.dateUtils.getDateRange('thisMonth');
    this.filteredLogs.set(await db.getLogsByRange(range.startDate, range.endDate));
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.filteredLogs.set(await db.getLogsByRange(range.startDate, range.endDate));
  }

  async deleteLog(id: number): Promise<void> {
    const ok = await this.confirm.confirm('Delete Log', 'Are you sure you want to delete this log entry?');
    if (ok) {
      await db.deleteLog(id);
      this.filteredLogs.update(logs => logs.filter(l => l.id !== id));
      this.notify.success('Log deleted');
    }
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }
}
