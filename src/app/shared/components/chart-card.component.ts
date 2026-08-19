import { Component, input, effect, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  standalone: true,
  selector: 'app-chart-card',
  imports: [CommonModule],
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.scss']
})
export class ChartCardComponent implements OnDestroy {
  title = input.required<string>();
  type = input<'line' | 'bar' | 'doughnut'>('line');
  labels = input.required<string[]>();
  datasets = input.required<{ label: string; data: number[]; color: string; backgroundColor?: string[]; minBarLength?: number; tooltipLabels?: (string | undefined)[] }[]>();
  chartColor = input<string>('#6750a4');
  cardBg = input<string>('var(--pwl-surface)');
  showLegend = input(false);
  legendItems = input<{ label: string; color: string }[]>([]);

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      this.labels();
      this.datasets();
      this.chartColor();
      setTimeout(() => this.renderChart(), 0);
    });
  }

  private renderChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const el = this.canvas();
    if (!el) return;

    const ctx = el.nativeElement.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const color = this.chartColor();

    const chartDatasets = this.datasets().map(ds => {
      const dsColor = ds.color || color;
      if (this.type() === 'line') {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: dsColor,
          backgroundColor: dsColor + '20',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: dsColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tooltipLabels: ds.tooltipLabels
        };
      } else {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor || dsColor + 'CC',
          borderColor: ds.backgroundColor || dsColor,
          borderWidth: 1,
          borderRadius: 6,
          minBarLength: ds.minBarLength,
          tooltipLabels: ds.tooltipLabels
        };
      }
    });

    this.chart = new Chart(ctx, {
      type: this.type(),
      data: {
        labels: this.labels(),
        datasets: chartDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: this.type() === 'doughnut' ? '65%' : undefined,
        plugins: {
          legend: {
            display: this.showLegend(),
            position: 'bottom',
            labels: {
              color: isDark ? '#a1a1a6' : '#6e6e73',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              padding: 14,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            titleColor: isDark ? '#f5f5f7' : '#1d1d1f',
            bodyColor: isDark ? '#a1a1a6' : '#6e6e73',
            borderColor: isDark ? '#38383a' : '#e5e5ea',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleFont: { family: 'Inter', weight: 'bold' as const },
            bodyFont: { family: 'Inter' },
            callbacks: {
              label: (ctx) => {
                const labels = (ctx.dataset as { tooltipLabels?: (string | undefined)[] }).tooltipLabels;
                const custom = labels?.[ctx.dataIndex];
                if (custom) return custom;
                if (this.type() === 'doughnut') return `${ctx.dataset.label}: ${ctx.parsed}`;
                return `${ctx.dataset.label}: ${ctx.parsed.y}`;
              }
            }
          }
        },
        scales: this.type() === 'doughnut' ? {} : {
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#a1a1a6' : '#6e6e73',
              font: { family: 'Inter', size: 11 }
            }
          },
          y: {
            grid: { color: isDark ? '#2c2c2e' : '#f0f0f2' },
            ticks: {
              color: isDark ? '#a1a1a6' : '#6e6e73',
              font: { family: 'Inter', size: 11 }
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}