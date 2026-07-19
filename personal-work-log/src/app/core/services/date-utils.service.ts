import { Injectable } from '@angular/core';
import { DateFilterType, DateRange } from '../models/work-log.model';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class DateUtilsService {
  today(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  getDateRange(type: DateFilterType): DateRange {
    const now = new Date();

    switch (type) {
      case 'today':
        return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };

      case 'yesterday': {
        const yesterday = subDays(now, 1);
        return { startDate: format(yesterday, 'yyyy-MM-dd'), endDate: format(yesterday, 'yyyy-MM-dd') };
      }

      case 'thisWeek': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      }

      case 'lastWeek': {
        const lastWeekEnd = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
        const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 1 });
        return { startDate: format(lastWeekStart, 'yyyy-MM-dd'), endDate: format(lastWeekEnd, 'yyyy-MM-dd') };
      }

      case 'thisMonth': {
        const monthStart = startOfMonth(now);
        return { startDate: format(monthStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      }

      case 'lastMonth': {
        const lastMonthEnd = subDays(startOfMonth(now), 1);
        const lastMonthStart = startOfMonth(lastMonthEnd);
        return { startDate: format(lastMonthStart, 'yyyy-MM-dd'), endDate: format(lastMonthEnd, 'yyyy-MM-dd') };
      }

      case 'thisYear': {
        const yearStart = startOfYear(now);
        return { startDate: format(yearStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      }

      default:
        return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    }
  }

  formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d, yyyy');
  }

  formatShortDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d');
  }

  getDayName(dateString: string): string {
    return format(parseISO(dateString), 'EEEE');
  }

  isFriday(dateString: string): boolean {
    return format(parseISO(dateString), 'EEEE') === 'Friday';
  }

  isSaturday(dateString: string): boolean {
    return format(parseISO(dateString), 'EEEE') === 'Saturday';
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}
