import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LunchTokenService } from '../../services/lunch-token.service';
import { addWeeks, format, parseISO } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-date-selection-card',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './date-selection-card.component.html',
  styleUrls: ['./date-selection-card.component.scss'],
})
export class DateSelectionCardComponent {
  service = inject(LunchTokenService);

  weekOffset = signal<number>(0); // 0 = This Week, 1 = Next Week
  todayStr = format(new Date(), 'yyyy-MM-dd');

  activeWeekReference = computed(() => {
    return addWeeks(new Date(), this.weekOffset());
  });

  activeWeekDays = computed(() => {
    return this.service.getWorkingDaysForWeek(this.activeWeekReference());
  });

  weekLabel = computed(() => {
    const days = this.activeWeekDays();
    if (days.length === 0) return '';
    const first = format(parseISO(days[0].date), 'MMM d');
    const last = format(parseISO(days[4].date), 'MMM d, yyyy');
    return `${first} – ${last}`;
  });

  selectedDateSet = computed(() => {
    return new Set(this.service.selectedDateTokens().map((d) => d.date));
  });

  // Disables Friday and Saturday in Angular Material datepicker
  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const day = date.getDay();
    return day !== 5 && day !== 6;
  };

  minDate = new Date();

  setWeekOffset(offset: number): void {
    this.weekOffset.set(offset);
  }

  isDaySelected(dateStr: string): boolean {
    return this.selectedDateSet().has(dateStr);
  }

  isPastDate(dateStr: string): boolean {
    return dateStr < this.todayStr;
  }

  onDayClick(dateStr: string): void {
    if (this.isPastDate(dateStr)) return;
    this.service.toggleDateSelection(dateStr);
  }

  onSelectAllWorkingDays(): void {
    this.service.selectAllWorkingDays(this.activeWeekReference());
  }

  onCustomDateSelected(date: Date | null, inputEl?: HTMLInputElement): void {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (inputEl) {
      inputEl.value = '';
    }
    if (this.selectedDateSet().has(dateStr)) {
      return;
    }
    this.service.toggleDateSelection(dateStr);
  }
}
