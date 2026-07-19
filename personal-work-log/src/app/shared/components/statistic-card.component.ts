import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-statistic-card',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stat-card" [style.background]="data().cardBg || ''">
      <div class="stat-header">
        <div class="stat-icon" [style.background]="data().iconBg">
          <mat-icon [style.color]="data().iconColor">{{ data().icon }}</mat-icon>
        </div>
      </div>
      <div class="stat-value" [style.color]="data().valueColor || ''">{{ data().value }}</div>
      <div class="stat-label">{{ data().label }}</div>
    </div>
  `,
  styles: [`
    .stat-card {
      border-radius: 14px;
      padding: 16px 20px;
      border: 1px solid var(--pwl-divider);
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 2px;
      line-height: 1.1;
    }

    .stat-label {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      font-weight: 500;
    }
  `]
})
export class StatisticCardComponent {
  data = input.required<{
    icon: string;
    iconColor: string;
    iconBg: string;
    cardBg?: string;
    valueColor?: string;
    value: string | number;
    label: string;
  }>();
}