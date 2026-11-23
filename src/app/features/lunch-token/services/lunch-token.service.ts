import { Injectable, inject, signal, computed } from '@angular/core';
import { LunchTokenRepository } from '../../../core/repositories/lunch-token.repository';
import { LunchTokenUser, SelectedDateToken } from '../../../core/models/lunch-token.model';
import { NotificationService } from '../../../core/services/notification.service';
import { format, parseISO, startOfWeek, addDays, isBefore, startOfDay } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class LunchTokenService {
  private repo = inject(LunchTokenRepository);
  private notify = inject(NotificationService);

  currentUserProfile = signal<LunchTokenUser | null>(null);
  selectedDateTokens = signal<SelectedDateToken[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Computes the total tokens for new/unreserved items ready for submission
  totalTokens = computed(() => {
    return this.selectedDateTokens()
      .filter((item) => !item.alreadyReserved)
      .reduce((sum, item) => sum + item.count, 0);
  });

  // Count of selectable, unreserved dates ready for reservation
  activeReservationsCount = computed(() => {
    return this.selectedDateTokens().filter((item) => !item.alreadyReserved).length;
  });

  async loadUserProfile(): Promise<LunchTokenUser | null> {
    this.loading.set(true);
    try {
      const profile = await this.repo.getUserProfile();
      this.currentUserProfile.set(profile);
      return profile;
    } catch (error) {
      this.notify.error('Failed to load Lunch Token profile');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async checkShortNameAvailable(shortName: string): Promise<boolean> {
    const trimmed = shortName.trim();
    if (!trimmed) return false;
    return this.repo.isShortNameAvailable(trimmed.toLowerCase());
  }

  async registerShortName(shortName: string): Promise<LunchTokenUser> {
    this.submitting.set(true);
    try {
      const profile = await this.repo.registerShortName(shortName);
      this.currentUserProfile.set(profile);
      this.notify.success(`Short Name "${profile.shortName}" registered successfully!`);
      return profile;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to register Short Name';
      this.notify.error(msg);
      throw error;
    } finally {
      this.submitting.set(false);
    }
  }

  getTodayStr(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  isWorkingDay(date: Date | string): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const day = d.getDay();
    // Sunday (0) through Thursday (4) are working days. Friday (5) and Saturday (6) are weekends.
    return day !== 5 && day !== 6;
  }

  getDayName(dateStr: string): string {
    return format(parseISO(dateStr), 'EEEE');
  }

  getDayShort(dateStr: string): string {
    return format(parseISO(dateStr), 'EEE');
  }

  getWorkingDaysForWeek(referenceDate: Date): SelectedDateToken[] {
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }); // Sunday
    const days: SelectedDateToken[] = [];

    // Sunday (0) to Thursday (4)
    for (let i = 0; i < 5; i++) {
      const dayDate = addDays(weekStart, i);
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      days.push({
        date: dateStr,
        dayName: format(dayDate, 'EEEE'),
        dayShort: format(dayDate, 'EEE'),
        count: 1,
      });
    }

    return days;
  }

  async refreshReservationStatus(dates: string[]): Promise<Set<string>> {
    const profile = this.currentUserProfile();
    if (!profile || dates.length === 0) return new Set();

    try {
      const existing = await this.repo.getExistingReservations(profile.id, dates);
      return new Set(existing.map((r) => r.reservationDate));
    } catch {
      return new Set();
    }
  }

  async toggleDateSelection(dateStr: string): Promise<void> {
    if (!this.isWorkingDay(dateStr)) {
      this.notify.warning('Friday and Saturday are non-working days and cannot be selected.');
      return;
    }

    const todayStr = this.getTodayStr();
    if (dateStr < todayStr) {
      this.notify.warning('Cannot reserve lunch tokens for past dates.');
      return;
    }

    const current = [...this.selectedDateTokens()];
    const index = current.findIndex((item) => item.date === dateStr);

    if (index >= 0) {
      // Remove from selection
      current.splice(index, 1);
      this.selectedDateTokens.set(current);
    } else {
      // Add to selection
      const reservedSet = await this.refreshReservationStatus([dateStr]);
      const isReserved = reservedSet.has(dateStr);

      const newItem: SelectedDateToken = {
        date: dateStr,
        dayName: this.getDayName(dateStr),
        dayShort: this.getDayShort(dateStr),
        count: 1,
        alreadyReserved: isReserved,
      };

      current.push(newItem);
      // Sort chronologically
      current.sort((a, b) => a.date.localeCompare(b.date));
      this.selectedDateTokens.set(current);

      if (isReserved) {
        this.notify.info(`You have already reserved lunch for ${format(parseISO(dateStr), 'MMM d, yyyy')}.`);
      }
    }
  }

  async selectAllWorkingDays(referenceDate: Date): Promise<void> {
    const weekDays = this.getWorkingDaysForWeek(referenceDate);
    const todayStr = this.getTodayStr();

    // Filter out any working days that are in the past
    const validDays = weekDays.filter((d) => d.date >= todayStr);

    if (validDays.length === 0) {
      this.notify.warning('All working days for this week have already passed.');
      return;
    }

    const dates = validDays.map((d) => d.date);
    const reservedSet = await this.refreshReservationStatus(dates);

    const merged = validDays.map((d) => ({
      ...d,
      count: 1,
      alreadyReserved: reservedSet.has(d.date),
    }));

    // Replace current selection with this week's working days
    this.selectedDateTokens.set(merged);

    const reservedCount = merged.filter((m) => m.alreadyReserved).length;
    if (reservedCount > 0) {
      this.notify.info(`${reservedCount} of the selected dates are already reserved.`);
    }
  }

  incrementToken(dateStr: string): void {
    const current = this.selectedDateTokens().map((item) => {
      if (item.date === dateStr && !item.alreadyReserved) {
        return { ...item, count: item.count + 1 };
      }
      return item;
    });
    this.selectedDateTokens.set(current);
  }

  decrementToken(dateStr: string): void {
    const current = this.selectedDateTokens().map((item) => {
      if (item.date === dateStr && !item.alreadyReserved) {
        return { ...item, count: Math.max(1, item.count - 1) };
      }
      return item;
    });
    this.selectedDateTokens.set(current);
  }

  removeDate(dateStr: string): void {
    const current = this.selectedDateTokens().filter((item) => item.date !== dateStr);
    this.selectedDateTokens.set(current);
  }

  clearSelection(): void {
    this.selectedDateTokens.set([]);
  }

  async submitReservations(): Promise<boolean> {
    const profile = this.currentUserProfile();
    if (!profile) {
      this.notify.error('Please register your Short Name before making reservations.');
      return false;
    }

    const itemsToSubmit = this.selectedDateTokens().filter((item) => !item.alreadyReserved);
    if (itemsToSubmit.length === 0) {
      this.notify.warning('No new dates to reserve.');
      return false;
    }

    // Double check each date is a working day and not in the past
    const todayStr = this.getTodayStr();
    for (const item of itemsToSubmit) {
      if (!this.isWorkingDay(item.date)) {
        this.notify.error(`Date ${item.date} is not a valid working day.`);
        return false;
      }
      if (item.date < todayStr) {
        this.notify.error(`Date ${item.date} is in the past.`);
        return false;
      }
      if (item.count < 1) {
        this.notify.error(`Invalid token count for ${item.date}. Minimum is 1.`);
        return false;
      }
    }

    this.submitting.set(true);
    try {
      // Re-verify against existing reservations to avoid duplicate submissions
      const dates = itemsToSubmit.map((i) => i.date);
      const existing = await this.repo.getExistingReservations(profile.id, dates);
      if (existing.length > 0) {
        const conflictDates = existing.map((e) => e.reservationDate).join(', ');
        this.notify.error(`Reservations already exist for: ${conflictDates}. Please refresh your selection.`);
        // Mark them as reserved
        const conflictSet = new Set(existing.map((e) => e.reservationDate));
        this.selectedDateTokens.update((items) =>
          items.map((it) => (conflictSet.has(it.date) ? { ...it, alreadyReserved: true } : it))
        );
        return false;
      }

      await this.repo.createReservations(
        profile.id,
        itemsToSubmit.map((i) => ({ date: i.date, count: i.count }))
      );

      this.notify.success(
        `Successfully reserved ${this.totalTokens()} lunch token(s) across ${itemsToSubmit.length} day(s)!`
      );

      // Clear selection upon successful reservation
      this.clearSelection();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to submit reservations';
      this.notify.error(msg);
      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
