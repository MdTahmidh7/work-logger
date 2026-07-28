import { Component, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DateUtilsService } from '../../../core/services/date-utils.service';

@Component({
  standalone: true,
  selector: 'app-attendance-filters',
  imports: [CommonModule, MatIconModule],
  templateUrl: './attendance-filters.component.html',
  styleUrls: ['./attendance-filters.component.scss']
})
export class AttendanceFiltersComponent {
  private dateUtils = inject(DateUtilsService);

  rangeChange = output<{ startDate: string; endDate: string }>();

  filters = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'yesterday', label: 'Yesterday', icon: 'history' },
    { value: 'thisWeek', label: 'This Week', icon: 'date_range' },
    { value: 'lastWeek', label: 'Last Week', icon: 'date_range' },
    { value: 'thisMonth', label: 'This Month', icon: 'calendar_today' },
    { value: 'lastMonth', label: 'Last Month', icon: 'calendar_today' },
    { value: 'thisYear', label: 'This Year', icon: 'event' }
  ];

  selected = signal('thisMonth');
  showCustom = signal(false);
  customStart = signal(new Date().toISOString().split('T')[0]);
  customEnd = signal(new Date().toISOString().split('T')[0]);

  constructor() {
    const range = this.dateUtils.getDateRange('thisMonth');
    this.rangeChange.emit(range);
  }

  select(value: string): void {
    this.selected.set(value);
    this.showCustom.set(false);
    const range = this.dateUtils.getDateRange(value);
    this.rangeChange.emit(range);
  }

  onStartChange(event: Event): void {
    this.customStart.set((event.target as HTMLInputElement).value);
    this.emitCustom();
  }

  onEndChange(event: Event): void {
    this.customEnd.set((event.target as HTMLInputElement).value);
    this.emitCustom();
  }

  private emitCustom(): void {
    this.selected.set('custom');
    this.rangeChange.emit({
      startDate: this.customStart(),
      endDate: this.customEnd()
    });
  }
}