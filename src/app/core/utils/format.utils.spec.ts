import {
  formatTime,
  formatWorkingHoursColon,
  formatWorkingHoursHM,
  formatDuration,
  isFriday,
  isSaturday,
  calculateWorkingMinutes,
} from './format.utils';

describe('format.utils', () => {
  describe('formatTime', () => {
    it('should format 24-hour time to 12-hour AM/PM format', () => {
      expect(formatTime('09:30')).toBe('9:30 AM');
      expect(formatTime('13:45')).toBe('1:45 PM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('should handle empty or placeholder string', () => {
      expect(formatTime('')).toBe('--');
      expect(formatTime('--')).toBe('--');
    });
  });

  describe('formatWorkingHoursColon & HM', () => {
    it('should format working minutes with colon', () => {
      expect(formatWorkingHoursColon(420)).toBe('07:00');
      expect(formatWorkingHoursColon(95)).toBe('01:35');
    });

    it('should format working minutes with h and m', () => {
      expect(formatWorkingHoursHM(420)).toBe('7h 0m');
      expect(formatWorkingHoursHM(95)).toBe('1h 35m');
    });

    it('should format duration', () => {
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(135)).toBe('2h 15m');
    });
  });

  describe('calculateWorkingMinutes', () => {
    it('should correctly calculate duration between punch in and punch out', () => {
      expect(calculateWorkingMinutes('09:00', '17:00')).toBe(480);
      expect(calculateWorkingMinutes('10:15', '18:45')).toBe(510);
      expect(calculateWorkingMinutes('17:00', '09:00')).toBe(0); // negative clamped to 0
    });
  });

  describe('weekend checks', () => {
    it('should identify Friday as weekend', () => {
      // 2026-11-13 is a Friday
      expect(isFriday('2026-11-13')).toBeTrue();
      expect(isFriday('2026-11-12')).toBeFalse();
    });

    it('should identify Saturday as weekend', () => {
      // 2026-11-14 is a Saturday
      expect(isSaturday('2026-11-14')).toBeTrue();
      expect(isSaturday('2026-11-13')).toBeFalse();
    });
  });
});
