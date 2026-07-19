import { Component, input, OnDestroy, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface ChartCardData {
  title: string;
  subtitle: string;
  type: 'line' | 'bar';
  data: {
    labels: string[];
    values: number[];
  };
}

@Component({
  standalone: true,
  selector: 'app-chart-card',
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './chart-card.html',
  styleUrls: ['./chart-card.scss']
})
export class ChartCardComponent implements AfterViewChecked, OnDestroy {
  data = input<ChartCardData>({
    title: 'Chart',
    subtitle: 'Subtitle',
    type: 'line',
    data: {
      labels: [],
      values: []
    }
  });

  chart: any;

  ngAfterViewChecked(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private renderChart(): void {
    const canvasId = `chart-${this.data().title.toLowerCase().replace(/\s+/g, '-')}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    this.chart = new Chart(ctx, {
      type: this.data().type,
      data: {
        labels: this.data().data.labels,
        datasets: [{
          label: this.data().title,
          data: this.data().data.values,
          borderColor: isDarkMode ? '#4CAF50' : '#2E7D32',
          backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(46, 125, 50, 0.1)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  getChartIcon(type: string): string {
    return type === 'line' ? 'trending_up' : 'show_chart';
  }
}