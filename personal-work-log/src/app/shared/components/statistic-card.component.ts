import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface StatisticCardData {
  icon: string;
  iconColor: string;
  value: number | string;
  label: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  trendValue?: number;
}

@Component({
  standalone: true,
  selector: 'app-statistic-card',
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './statistic-card.component.html',
  styleUrls: ['./statistic-card.component.scss']
})
export class StatisticCardComponent {
  data = input<StatisticCardData>({
    icon: 'info',
    iconColor: '#2196F3',
    value: 0,
    label: 'Label',
    change: 0,
    changeType: 'neutral'
  });

  get changeColor(): string {
    if (!this.data().change) return 'var(--text-tertiary)';
    return this.data().changeType === 'increase' ? '#4CAF50' : 
           this.data().changeType === 'decrease' ? '#F44336' : 'var(--text-tertiary)';
  }

  get changeIcon(): string {
    return this.data().changeType === 'increase' ? 'trending_up' : 
           this.data().changeType === 'decrease' ? 'trending_down' : 'remove';
  }

  formatValue(value: number | string): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      } else if (Number.isInteger(value)) {
        return value.toString();
      } else {
        return value.toFixed(1);
      }
    }
    return value.toString();
  }
}