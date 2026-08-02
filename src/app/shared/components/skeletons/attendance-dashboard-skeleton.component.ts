import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveService } from '../../../core/services/responsive.service';

@Component({
  standalone: true,
  selector: 'app-attendance-dashboard-skeleton',
  imports: [CommonModule],
  templateUrl: './attendance-dashboard-skeleton.component.html',
  styleUrls: ['./attendance-dashboard-skeleton.component.scss']
})
export class AttendanceDashboardSkeletonComponent {
  responsive = inject(ResponsiveService);
}
