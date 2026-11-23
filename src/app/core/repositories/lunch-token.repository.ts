import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import {
  LunchTokenUser,
  LunchTokenReservation,
  LunchTokenHistoryFilter,
  LunchTokenHistoryResult,
  LunchTokenHistoryItem,
} from '../models/lunch-token.model';

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
    return {
      id: row.id,
      lunchTokenUserId: row.lunch_token_user_id,
      reservationDate: row.reservation_date,
      tokenCount: row.token_count,
      createdAt: row.created_at,
      shortName: row.lunch_token_users?.short_name || undefined,
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
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.supabase
      .from(this.RESERVATIONS_TABLE)
      .select('id, lunch_token_user_id, reservation_date, token_count, created_at, lunch_token_users!inner(short_name, normalized_short_name)', { count: 'exact' });

    if (startDate) {
      query = query.gte('reservation_date', startDate);
    }
    if (endDate) {
      query = query.lte('reservation_date', endDate);
    }
    if (shortName && shortName.trim()) {
      const normalized = shortName.trim().toLowerCase();
      query = query.ilike('lunch_token_users.normalized_short_name', `%${normalized}%`);
    }

    query = query
      .order('reservation_date', { ascending: false })
      .order('created_at', { ascending: true })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const rawRows = data || [];
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Extract unique dates on this page to fetch daily totals across all users
    const uniqueDates = Array.from(new Set(rawRows.map((r: any) => r.reservation_date)));
    const dailyTotalsMap = new Map<string, number>();

    if (uniqueDates.length > 0) {
      const { data: dateAggregates, error: aggError } = await this.supabase.supabase
        .from(this.RESERVATIONS_TABLE)
        .select('reservation_date, token_count')
        .in('reservation_date', uniqueDates);

      if (!aggError && dateAggregates) {
        for (const row of dateAggregates) {
          const prev = dailyTotalsMap.get(row.reservation_date) || 0;
          dailyTotalsMap.set(row.reservation_date, prev + row.token_count);
        }
      }
    }

    const items: LunchTokenHistoryItem[] = rawRows.map((row: any) => {
      const dateStr = row.reservation_date;
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        id: row.id,
        reservationDate: dateStr,
        dayName,
        shortName: row.lunch_token_users?.short_name || 'Unknown',
        tokenCount: row.token_count,
        dailyTotalTokens: dailyTotalsMap.get(dateStr) || row.token_count,
        createdAt: row.created_at,
      };
    });

    return {
      items,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }
}
