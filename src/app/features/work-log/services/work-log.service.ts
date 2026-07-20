import { Injectable, inject } from '@angular/core';
import { WorkLogRepository } from '../../../core/repositories/work-log.repository';
import { WorkLog, BackupData } from '../../../core/models/work-log.model';
import { DateFilterType } from '../../../core/models/work-log.model';
import { DateUtilsService } from '../../../core/services/date-utils.service';

@Injectable({ providedIn: 'root' })
export class WorkLogService {
  private repo = inject(WorkLogRepository);
  private dateUtils = inject(DateUtilsService);

  async getAll(): Promise<WorkLog[]> {
    return this.repo.getAll();
  }

  async getById(id: number): Promise<WorkLog | undefined> {
    return this.repo.getById(id);
  }

  async getByRange(startDate: string, endDate: string): Promise<WorkLog[]> {
    return this.repo.getByRange(startDate, endDate);
  }

  async getByDate(date: string): Promise<WorkLog[]> {
    return this.repo.getByDate(date);
  }

  async create(log: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return this.repo.create(log);
  }

  async update(id: number, updates: Partial<WorkLog>): Promise<number> {
    return this.repo.update(id, updates);
  }

  async delete(id: number): Promise<void> {
    return this.repo.delete(id);
  }

  async search(query: string): Promise<WorkLog[]> {
    return this.repo.search(query);
  }

  async importLogs(data: BackupData): Promise<number> {
    return this.repo.import(data);
  }

  async clearAll(): Promise<void> {
    return this.repo.clear();
  }

  getDayName(date: string): string {
    return this.dateUtils.getDayName(date);
  }

  formatShortDate(date: string): string {
    return this.dateUtils.formatShortDate(date);
  }

  formatDate(date: string): string {
    return this.dateUtils.formatDate(date);
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }

  isFriday(date: string): boolean {
    return this.dateUtils.isFriday(date);
  }

  isSaturday(date: string): boolean {
    return this.dateUtils.isSaturday(date);
  }

  getDateRange(type: DateFilterType): { startDate: string; endDate: string } {
    return this.dateUtils.getDateRange(type);
  }
}
