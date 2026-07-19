import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-list',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="work-log-list">
      @if (logs().length === 0) {
        <div class="empty-state">
          <mat-icon>work_off</mat-icon>
          <h3>No work logs found</h3>
          <p>Start tracking your work by adding your first log entry.</p>
          <a routerLink="/work-log" class="add-btn">
            <mat-icon>add</mat-icon>
            Add Work Log
          </a>
        </div>
      } @else {
        @for (log of logs(); track log.id) {
          <div class="log-entry">
            <div class="log-main">
              <div class="log-title">{{ log.title }}</div>
              @if (log.details) {
                <div class="log-details">{{ log.details }}</div>
              }
              <div class="log-date">{{ log.date }}</div>
            </div>
            <div class="log-meta">
              <span class="duration">{{ formatDuration(log.durationMinutes) }}</span>
              <div class="log-actions">
                <a [routerLink]="['/edit', log.id]" mat-icon-button class="action-btn">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button class="action-btn delete-btn" (click)="onDelete.emit(log.id!)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .work-log-list { display: flex; flex-direction: column; gap: 8px; }

    .empty-state {
      text-align: center; padding: 60px 20px;
      background: var(--pwl-surface); border-radius: 16px; border: 1px solid var(--pwl-divider);
    }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--pwl-text-tertiary); margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 8px; }
    .empty-state p { color: var(--pwl-text-secondary); margin-bottom: 24px; }
    .add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 12px 24px; border-radius: 12px; background: var(--pwl-primary);
      color: white; font-weight: 600; text-decoration: none; transition: all 0.2s;
    }
    .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

    .log-entry {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-radius: 10px; background: var(--pwl-surface);
      border: 1px solid var(--pwl-divider); transition: background 0.2s;
    }
    .log-entry:hover { background: var(--pwl-surface-variant); }

    .log-main { flex: 1; min-width: 0; }
    .log-title { font-size: 15px; font-weight: 600; color: var(--pwl-text-primary); margin-bottom: 2px; }
    .log-details { font-size: 13px; color: var(--pwl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .log-date { font-size: 12px; color: var(--pwl-text-tertiary); margin-top: 4px; }

    .log-meta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .duration {
      font-size: 14px; font-weight: 600; color: var(--pwl-primary);
      background: var(--pwl-primary-light); padding: 4px 10px; border-radius: 8px;
    }
    .log-actions { display: flex; gap: 2px; }
    .action-btn { width: 34px; height: 34px; color: var(--pwl-text-secondary); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class WorkLogListComponent {
  logs = input.required<WorkLog[]>();
  onDelete = output<number>();

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
