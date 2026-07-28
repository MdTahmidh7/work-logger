import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-statistic-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './statistic-card.component.html',
  styleUrls: ['./statistic-card.component.scss']
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