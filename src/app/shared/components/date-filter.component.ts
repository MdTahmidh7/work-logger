import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { DateFilterType } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-date-filter',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.scss']
})
export class DateFilterComponent {
  rangeChange = output<{ startDate: string; endDate: string }>();

  private dateUtils = inject(DateUtilsService);

  filters = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'yesterday', label: 'Yesterday', icon: 'history' },
    { value: 'thisWeek', label: 'This Week', icon: 'date_range' },
    { value: 'thisMonth', label: 'This Month', icon: 'calendar_today' }
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
    const range = this.dateUtils.getDateRange(value as DateFilterType);
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