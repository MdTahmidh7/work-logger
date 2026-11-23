import { Injectable, inject, signal, computed } from '@angular/core';
import { LunchTokenRepository } from '../../../core/repositories/lunch-token.repository';
import { LunchTokenUser, SelectedDateToken } from '../../../core/models/lunch-token.model';
import { NotificationService } from '../../../core/services/notification.service';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

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
    if (this.submitting()) throw new Error('Registration in progress');
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
    return !isNaN(day) && day >= 0 && day <= 4;
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

  async refreshReservationStatus(dates: string[]): Promise<Map<string, number>> {
    const profile = this.currentUserProfile();
    const map = new Map<string, number>();
    if (!profile || dates.length === 0) return map;

    try {
      const existing = await this.repo.getExistingReservations(profile.id, dates);
      for (const r of existing) {
        map.set(r.reservationDate, r.tokenCount);
      }
      return map;
    } catch {
      return map;
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

    // Check if already selected
    const existingIndex = this.selectedDateTokens().findIndex((item) => item.date === dateStr);
    if (existingIndex >= 0) {
      // Remove
      this.selectedDateTokens.update((list) => list.filter((item) => item.date !== dateStr));
      return;
    }

    // Fetch existing reservation for this date
    const reservedMap = await this.refreshReservationStatus([dateStr]);
    const isReserved = reservedMap.has(dateStr);
    const reservedTokens = reservedMap.get(dateStr) ?? 1;

    const newItem: SelectedDateToken = {
      date: dateStr,
      dayName: this.getDayName(dateStr),
      dayShort: this.getDayShort(dateStr),
      count: reservedTokens,
      alreadyReserved: isReserved,
    };

    // Update atomically, avoiding duplicate insertion if race occurs
    this.selectedDateTokens.update((current) => {
      if (current.some((it) => it.date === dateStr)) {
        return current;
      }
      const updated = [...current, newItem];
      updated.sort((a, b) => a.date.localeCompare(b.date));
      return updated;
    });

    if (isReserved) {
      this.notify.info(`You have already reserved ${reservedTokens} lunch token(s) for ${format(parseISO(dateStr), 'MMM d, yyyy')}.`);
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
    const reservedMap = await this.refreshReservationStatus(dates);

    const merged = validDays.map((d) => ({
      ...d,
      count: reservedMap.get(d.date) ?? 1,
      alreadyReserved: reservedMap.has(d.date),
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
    if (this.submitting()) return false;

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
      if (!Number.isInteger(item.count) || item.count < 1) {
        this.notify.error(`Invalid token count for ${item.date}. Must be a positive integer.`);
        return false;
      }
    }

    const totalToSubmit = itemsToSubmit.reduce((sum, item) => sum + item.count, 0);

    this.submitting.set(true);
    try {
      // Re-verify against existing reservations to avoid duplicate submissions
      const dates = itemsToSubmit.map((i) => i.date);
      const existing = await this.repo.getExistingReservations(profile.id, dates);
      if (existing.length > 0) {
        const conflictDates = existing.map((e) => e.reservationDate).join(', ');
        this.notify.error(`Reservations already exist for: ${conflictDates}. Please refresh your selection.`);
        // Mark them as reserved
        const conflictMap = new Map(existing.map((e) => [e.reservationDate, e.tokenCount]));
        this.selectedDateTokens.update((items) =>
          items.map((it) =>
            conflictMap.has(it.date)
              ? { ...it, alreadyReserved: true, count: conflictMap.get(it.date)! }
              : it
          )
        );
        return false;
      }

      await this.repo.createReservations(
        profile.id,
        itemsToSubmit.map((i) => ({ date: i.date, count: i.count }))
      );

      this.notify.success(
        `Successfully reserved ${totalToSubmit} lunch token(s) across ${itemsToSubmit.length} day(s)!`
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

