import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import {
  LunchTokenUser,
  LunchTokenReservation,
  LunchTokenHistoryFilter,
  LunchTokenHistoryResult,
  LunchTokenDailyHistoryItem,
} from '../models/lunch-token.model';
import { format, parseISO } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class LunchTokenRepository {
  private supabase = inject(SupabaseService);
  private readonly USERS_TABLE = 'lunch_token_users';
  private readonly RESERVATIONS_TABLE = 'lunch_token_reservations';

  private async getUserId(): Promise<string> {
    const userId = await this.supabase.getUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  private mapUserRow(row: any): LunchTokenUser {
    return {
      id: row.id,
      userId: row.user_id,
      shortName: row.short_name,
      normalizedShortName: row.normalized_short_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapReservationRow(row: any): LunchTokenReservation {
    const userJoin = row.lunch_token_users;
    const shortNameVal = Array.isArray(userJoin)
      ? userJoin[0]?.short_name
      : userJoin?.short_name;

    return {
      id: row.id,
      lunchTokenUserId: row.lunch_token_user_id,
      reservationDate: row.reservation_date,
      tokenCount: row.token_count,
      paymentStatus: (row.payment_status as 'pending' | 'paid') || 'pending',
      createdAt: row.created_at,
      shortName: shortNameVal || undefined,
    };
  }

  async getUserProfile(userId?: string): Promise<LunchTokenUser | null> {
    const uid = userId || (await this.getUserId());
    const { data, error } = await this.supabase.supabase
      .from(this.USERS_TABLE)
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return this.mapUserRow(data);
  }

  async isShortNameAvailable(normalizedShortName: string): Promise<boolean> {
    const { data, error } = await this.supabase.supabase
      .from(this.USERS_TABLE)
      .select('id')
      .eq('normalized_short_name', normalizedShortName)
      .maybeSingle();

    if (error) throw error;
    return !data;
  }

  async registerShortName(shortName: string): Promise<LunchTokenUser> {
    const userId = await this.getUserId();
    const trimmed = shortName.trim();
    if (!trimmed) {
      throw new Error('Short Name cannot be empty');
    }

    const normalized = trimmed.toLowerCase();
    const available = await this.isShortNameAvailable(normalized);
    if (!available) {
      throw new Error(`The Short Name "${trimmed}" is already taken. Please choose another.`);
    }

    const { data, error } = await this.supabase.supabase
      .from(this.USERS_TABLE)
      .insert({
        user_id: userId,
        short_name: trimmed,
        normalized_short_name: normalized,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message?.includes('user_id') || error.details?.includes('user_id')) {
          throw new Error('You have already registered a Short Name.');
        }
        throw new Error(`The Short Name "${trimmed}" is already registered.`);
      }
      throw error;
    }

    return this.mapUserRow(data);
  }

  async getExistingReservations(lunchTokenUserId: number, dates: string[]): Promise<LunchTokenReservation[]> {
    if (!dates || dates.length === 0) return [];

    const { data, error } = await this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .select('*')
      .eq('lunch_token_user_id', lunchTokenUserId)
      .in('reservation_date', dates);

    if (error) throw error;
    return (data || []).map((row: any) => this.mapReservationRow(row));
  }

  async createReservations(
    lunchTokenUserId: number,
    reservations: { date: string; count: number }[]
  ): Promise<void> {
    if (!reservations || reservations.length === 0) return;

    const rows = reservations.map((r) => ({
      lunch_token_user_id: lunchTokenUserId,
      reservation_date: r.date,
      token_count: r.count,
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .insert(rows);

    if (error) {
      if (error.code === '23505') {
        throw new Error('One or more of the selected dates have already been reserved.');
      }
      throw error;
    }
  }

  async getReservationsHistory(
    filter: LunchTokenHistoryFilter
  ): Promise<LunchTokenHistoryResult> {
    const { page, pageSize, startDate, endDate, shortName } = filter;

    let query = this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .select('id, lunch_token_user_id, reservation_date, token_count, payment_status, created_at, lunch_token_users!inner(short_name, normalized_short_name)');

    if (startDate) {
      query = query.gte('reservation_date', startDate);
    }
    if (endDate) {
      query = query.lte('reservation_date', endDate);
    }

    query = query
      .order('reservation_date', { ascending: false })
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    const rawRows = data || [];

    // Group rows by reservation_date into a Map so each day is exactly 1 row
    const dateMap = new Map<string, { date: string; users: { shortName: string; tokenCount: number; paymentStatus: 'pending' | 'paid' }[]; totalTokens: number }>();

    for (const row of (rawRows as any[])) {
      const dateStr = row.reservation_date;
      const userJoin = row.lunch_token_users;
      const shortNameVal = Array.isArray(userJoin)
        ? userJoin[0]?.short_name || 'Unknown'
        : userJoin?.short_name || 'Unknown';
      const tokenCountVal = row.token_count || 1;
      const paymentStatusVal = (row.payment_status as 'pending' | 'paid') || 'pending';

      let group = dateMap.get(dateStr);
      if (!group) {
        group = {
          date: dateStr,
          users: [],
          totalTokens: 0,
        };
        dateMap.set(dateStr, group);
      }

      group.users.push({
        shortName: shortNameVal,
        tokenCount: tokenCountVal,
        paymentStatus: paymentStatusVal,
      });
      group.totalTokens += tokenCountVal;
    }

    // Convert map to array of days
    let dailyList = Array.from(dateMap.values());

    // If shortName filter is active, filter days where at least one user matches the short name
    if (shortName && shortName.trim()) {
      const search = shortName.trim().toLowerCase();
      dailyList = dailyList.filter((day) =>
        day.users.some((u) => u.shortName.toLowerCase().includes(search))
      );
    }

    const totalCount = dailyList.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedDays = dailyList.slice(page * pageSize, (page + 1) * pageSize);

    const items: LunchTokenDailyHistoryItem[] = paginatedDays.map((d) => {
      const dayDate = parseISO(d.date);
      const dayName = format(dayDate, 'EEEE');
      return {
        reservationDate: d.date,
        dayName,
        users: d.users,
        totalTokens: d.totalTokens,
      };
    });

    return {
      items,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }

  async getPendingReservations(lunchTokenUserId: number): Promise<LunchTokenReservation[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .select('*')
      .eq('lunch_token_user_id', lunchTokenUserId)
      .eq('payment_status', 'pending')
      .order('reservation_date', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => this.mapReservationRow(row));
  }

  async markReservationsAsPaid(reservationIds: number[]): Promise<void> {
    if (!reservationIds || reservationIds.length === 0) return;

    const { error } = await this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .update({ payment_status: 'paid' })
      .in('id', reservationIds);

    if (error) throw error;
  }
}
