export interface LunchTokenUser {
  id: number;
  userId: string;
  shortName: string;
  normalizedShortName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LunchTokenReservation {
  id?: number;
  lunchTokenUserId: number;
  reservationDate: string; // 'yyyy-MM-dd'
  tokenCount: number;
  createdAt?: string;
  shortName?: string;
}

export interface SelectedDateToken {
  date: string; // 'yyyy-MM-dd'
  dayName: string; // 'Sunday', 'Monday', etc.
  dayShort: string; // 'Sun', 'Mon'
  count: number;
  alreadyReserved?: boolean;
}

export interface DailyReservedUser {
  shortName: string;
  tokenCount: number;
}

export interface LunchTokenDailyHistoryItem {
  reservationDate: string; // 'yyyy-MM-dd'
  dayName: string;
  users: DailyReservedUser[];
  totalTokens: number;
}

export interface LunchTokenHistoryFilter {
  startDate?: string;
  endDate?: string;
  shortName?: string;
  page: number;
  pageSize: number;
}

export interface LunchTokenHistoryResult {
  items: LunchTokenDailyHistoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

