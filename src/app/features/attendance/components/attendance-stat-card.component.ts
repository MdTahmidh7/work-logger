import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-attendance-stat-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './attendance-stat-card.component.html',
  styleUrls: ['./attendance-stat-card.component.scss']
})
export class AttendanceStatCardComponent {
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