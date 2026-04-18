import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.appSetting.findMany();
    return rows.reduce<Record<string, unknown>>((acc, r) => {
      acc[r.key] = r.valueJson;
      return acc;
    }, {});
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return (row?.valueJson as T | undefined) ?? undefined;
  }

  async set(key: string, value: unknown, type: string, updatedBy?: string) {
    return this.prisma.appSetting.upsert({
      where: { key },
      create: { key, valueJson: value as never, type, updatedBy },
      update: { valueJson: value as never, type, updatedBy },
    });
  }
}
