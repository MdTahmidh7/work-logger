import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-list',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './work-log-list.component.html',
  styleUrls: ['./work-log-list.component.scss']
})
export class WorkLogListComponent {
  logs = input.required<WorkLog[]>();
  onDelete = output<number>();

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
