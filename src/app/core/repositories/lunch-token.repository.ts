import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { LunchTokenUser, LunchTokenReservation } from '../models/lunch-token.model';

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
}
