import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { WorkLogListComponent } from '../../shared/components/work-log-list.component';
import { WorkLogService } from './services/work-log.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-list-page',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, DateFilterComponent, WorkLogListComponent],
  templateUrl: './work-log-list-page.component.html',
  styleUrls: ['./work-log-list-page.component.scss']
})
export class WorkLogListPageComponent implements OnInit {
  private dateUtils = inject(DateUtilsService);
  private confirm = inject(ConfirmDialogService);
  private notify = inject(NotificationService);
  private workLogService = inject(WorkLogService);

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
    this.filteredLogs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.filteredLogs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
  }

  async deleteLog(id: number): Promise<void> {
    const ok = await this.confirm.confirm('Delete Log', 'Are you sure you want to delete this log entry?');
    if (ok) {
      try {
        await this.workLogService.delete(id);
        this.filteredLogs.update(logs => logs.filter(l => l.id !== id));
        this.notify.success('Log deleted');
      } catch {
        this.notify.error('Failed to delete log');
      }
    }
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }
}
