import { TestBed } from '@angular/core/testing';
import { DateUtilsService } from './date-utils.service';

describe('DateUtilsService', () => {
  let service: DateUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return a valid ISO date for today()', () => {
    const today = service.today();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return correct ranges for date filters', () => {
    const todayRange = service.getDateRange('today');
    expect(todayRange.startDate).toBe(todayRange.endDate);

    const last30Range = service.getDateRange('last30Days');
    expect(last30Range.startDate <= last30Range.endDate).toBeTrue();
  });

  it('should correctly format durations', () => {
    expect(service.formatDuration(30)).toBe('30m');
    expect(service.formatDuration(60)).toBe('1h');
    expect(service.formatDuration(90)).toBe('1h 30m');
  });
});
