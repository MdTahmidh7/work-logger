import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../services/lunch-token.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LunchTokenDailyHistoryItem, LunchTokenHistoryFilter } from '../../../core/models/lunch-token.model';
import { format, parseISO, startOfWeek, differenceInCalendarWeeks } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-lunch-token-history',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './lunch-token-history.component.html',
  styleUrls: ['./lunch-token-history.component.scss'],
})
export class LunchTokenHistoryComponent implements OnInit {
  private service = inject(LunchTokenService);
  private notify = inject(NotificationService);

  loading = signal<boolean>(true);
  records = signal<LunchTokenDailyHistoryItem[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(0);
  readonly pageSize = 15;

  // Filter inputs
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterShortName = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);

    const start = this.filterStartDate().trim();
    const end = this.filterEndDate().trim();

    if (start && end && start > end) {
      this.notify.warning('Start Date cannot be after End Date.');
      this.loading.set(false);
      return;
    }

    const filter: LunchTokenHistoryFilter = {
      page: this.currentPage(),
      pageSize: this.pageSize,
      startDate: start || undefined,
      endDate: end || undefined,
      shortName: this.filterShortName().trim() || undefined,
    };

    try {
      const result = await this.service.getReservationsHistory(filter);
      this.records.set(result.items);
      this.totalCount.set(result.totalCount);
      this.totalPages.set(result.totalPages);
      this.currentPage.set(result.currentPage);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load reservation history';
      this.notify.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    this.currentPage.set(0);
    this.loadData();
  }

  clearFilters(): void {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterShortName.set('');
    this.currentPage.set(0);
    this.loadData();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterStartDate() || this.filterEndDate() || this.filterShortName().trim());
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.loadData();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.loadData();
    }
  }

  formatDate(dateStr: string): string {
    return format(parseISO(dateStr), 'd MMM yyyy');
  }

  isFridayOrSaturday(dateStr: string): boolean {
    const d = parseISO(dateStr);
    const day = d.getDay();
    return day === 5 || day === 6;
  }

  getWeekStartStr(dateStr: string): string {
    try {
      const d = parseISO(dateStr);
      const sunday = startOfWeek(d, { weekStartsOn: 0 });
      return format(sunday, 'yyyy-MM-dd');
    } catch {
      return dateStr;
    }
  }

  isAlternatingWeek(dateStr: string): boolean {
    try {
      const d = parseISO(dateStr);
      const sunday = startOfWeek(d, { weekStartsOn: 0 });
      // Anchor base to fixed Sunday (Jan 4, 2026) to alternate week bands cleanly
      const weeks = differenceInCalendarWeeks(sunday, new Date(2026, 0, 4), { weekStartsOn: 0 });
      return Math.abs(weeks) % 2 === 1;
    } catch {
      return false;
    }
  }

  isWeekBoundary(index: number): boolean {
    if (index === 0) return false;
    const items = this.records();
    if (!items[index - 1] || !items[index]) return false;
    return this.getWeekStartStr(items[index - 1].reservationDate) !== this.getWeekStartStr(items[index].reservationDate);
  }
}

export default LunchTokenHistoryComponent;
