export function formatTime(time: string): string {
  if (!time || time === '--') return '--';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatWorkingHoursColon(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatWorkingHoursHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDateDisplay(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDateDisplay(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDayName(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatFullDayName(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
}

export function isWeekend(date: string): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 5 || day === 6;
}

export function isFriday(date: string): boolean {
  return new Date(date).getDay() === 5;
}

export function isSaturday(date: string): boolean {
  return new Date(date).getDay() === 6;
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calculateWorkingMinutes(punchIn: string, punchOut: string): number {
  const [inH, inM] = punchIn.split(':').map(Number);
  const [outH, outM] = punchOut.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  return Math.max(0, totalMinutes);
}
