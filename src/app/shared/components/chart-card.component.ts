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
        const isBar = this.type() === 'bar';
        const bg = ds.backgroundColor;
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: bg && isBar
            ? (ctx: any) => {
                const color = (bg as string[])[ctx.dataIndex] || dsColor;
                const { ctx: c, chartArea } = ctx.chart;
                if (!chartArea) return color;
                const grad = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                grad.addColorStop(0, color + '40');
                grad.addColorStop(1, color);
                return grad;
              }
            : bg || dsColor + 'CC',
          borderColor: bg && isBar
            ? (ctx: any) => (bg as string[])[ctx.dataIndex] || dsColor
            : bg || dsColor,
          borderWidth: isBar ? 0 : 1,
          borderRadius: isBar ? 8 : 6,
          borderSkipped: isBar ? false : undefined,
          barPercentage: isBar ? 0.65 : undefined,
          categoryPercentage: isBar ? 0.85 : undefined,
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
            border: { display: false },
            ticks: {
              color: isDark ? '#a1a1a6' : '#6e6e73',
              font: { family: 'Inter', size: 11 },
              autoSkip: true,
              maxTicksLimit: 10,
              maxRotation: 0
            }
          },
          y: {
            border: { display: false },
            grid: {
              color: isDark ? 'rgba(161, 161, 166, 0.08)' : 'rgba(110, 110, 115, 0.10)',
              drawTicks: false
            },
            ticks: {
              color: isDark ? '#a1a1a6' : '#6e6e73',
              font: { family: 'Inter', size: 11 },
              padding: 8
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