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

export interface LunchTokenHistoryItem {
  id: number;
  reservationDate: string; // 'yyyy-MM-dd'
  dayName: string;
  shortName: string;
  tokenCount: number;
  dailyTotalTokens: number;
  createdAt: string;
}

export interface LunchTokenHistoryFilter {
  startDate?: string;
  endDate?: string;
  shortName?: string;
  page: number;
  pageSize: number;
}

export interface LunchTokenHistoryResult {
  items: LunchTokenHistoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

