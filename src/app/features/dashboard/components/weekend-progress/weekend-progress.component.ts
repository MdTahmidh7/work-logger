import { Component, signal, OnInit, OnDestroy, NgZone, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-weekend-progress',
  imports: [CommonModule, MatIconModule],
  templateUrl: './weekend-progress.component.html',
  styleUrls: ['./weekend-progress.component.scss']
})
export class WeekendProgressComponent implements OnInit, OnDestroy, AfterViewInit {
  days = signal<number>(0);
  hours = signal<number>(0);

  weekProgressPercent = signal<number>(0);
  elapsedLabel = signal<string>('');
  remainingLabel = signal<string>('');

  @ViewChild('minutesStrip') minutesStrip!: ElementRef<HTMLElement>;

  private targetMinutes = 0;
  private currentY = -1;
  private rafId: number | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly DIGIT_HEIGHT = 42;
  private minutesArray: number[] = [];

  constructor(private zone: NgZone) {
    this.minutesArray = Array.from({ length: 60 }, (_, i) => i);
  }

  ngOnInit(): void {
    this.refreshValues();

    this.zone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => this.zone.run(() => this.refreshValues()), 1000);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.applyTransform(true);
      this.startAnimation();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private refreshValues(): void {
    const now = new Date();
    const countdown = this.calcCountdown(now);
    this.days.set(countdown.days);
    this.hours.set(countdown.hours);
    this.targetMinutes = countdown.minutes;

    const p = this.calcProgress(now);
    this.weekProgressPercent.set(p.percent);
    this.elapsedLabel.set(p.elapsed);
    this.remainingLabel.set(p.remaining);
  }

  private startAnimation(): void {
    const animate = () => {
      if (Math.abs(this.currentY - this.targetMinutes) > 0.01) {
        this.currentY += (this.targetMinutes - this.currentY) * 0.08;
        this.applyTransform(false);
      } else if (this.currentY !== this.targetMinutes) {
        this.currentY = this.targetMinutes;
        this.applyTransform(false);
      }
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  private applyTransform(instant: boolean): void {
    if (!this.minutesStrip?.nativeElement) return;
    const el = this.minutesStrip.nativeElement;
    if (instant) {
      el.style.transition = 'none';
    } else {
      el.style.transition = '';
    }
    el.style.transform = `translateY(${-this.currentY * this.DIGIT_HEIGHT}px)`;
  }

  private calcCountdown(now: Date): { days: number; hours: number; minutes: number } {
    const target = new Date(now);
    const daysUntilThu = (4 - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + daysUntilThu);
    target.setHours(17, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 7);

    const diff = target.getTime() - now.getTime();
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000)
    };
  }

  private calcProgress(now: Date): { percent: number; elapsed: string; remaining: string } {
    const day = now.getDay();
    let weekStart = new Date(now);
    weekStart.setHours(9, 0, 0, 0);

    if (day === 0 && now.getHours() < 9) {
      weekStart.setDate(now.getDate() - 7);
    } else if (day === 0) {
      weekStart.setDate(now.getDate());
    } else {
      weekStart.setDate(now.getDate() - ((day - 0 + 7) % 7));
    }

    let weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);
    weekEnd.setHours(17, 0, 0, 0);

    if (now >= weekEnd) {
      return { percent: 100, elapsed: this.fmtHm(weekEnd.getTime() - weekStart.getTime()), remaining: '0h 0m' };
    }
    if (now <= weekStart) {
      return { percent: 0, elapsed: '0h 0m', remaining: this.fmtHm(weekEnd.getTime() - weekStart.getTime()) };
    }

    const total = weekEnd.getTime() - weekStart.getTime();
    const elapsed = now.getTime() - weekStart.getTime();
    return {
      percent: Math.min(100, Math.max(0, (elapsed / total) * 100)),
      elapsed: this.fmtHm(elapsed),
      remaining: this.fmtHm(weekEnd.getTime() - now.getTime())
    };
  }

  private fmtHm(ms: number): string {
    const totalMin = Math.floor(ms / 60000);
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  }

  get minutesArrayRef(): number[] {
    return this.minutesArray;
  }

  formatDigit(n: number): string {
    return String(n).padStart(2, '0');
  }
}
