import { Injectable } from '@nestjs/common';

const START_HOUR = 8;
const END_HOUR = 22;

@Injectable()
export class NotificacaoWindowService {
  nextAllowedDate(base: Date, timezone = 'America/Sao_Paulo'): Date {
    let candidate = new Date(base);

    for (let i = 0; i < 96; i += 1) {
      const hour = this.hourInTimezone(candidate, timezone);
      if (hour >= START_HOUR && hour < END_HOUR) {
        return candidate;
      }

      candidate = new Date(candidate.getTime() + 30 * 60 * 1000);
    }

    return candidate;
  }

  delayUntilAllowed(base: Date, timezone?: string): number {
    const allowed = this.nextAllowedDate(base, timezone);
    return Math.max(0, allowed.getTime() - Date.now());
  }

  private hourInTimezone(date: Date, timezone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);

    return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  }
}
