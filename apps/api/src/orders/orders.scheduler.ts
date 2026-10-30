import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OrdersService } from './orders.service';

/** هر ۵ دقیقه: بستن سبدهای ۱۰ روزه منقضی، یادآوری و لغو سفارش‌های بی‌پرداخت */
@Injectable()
export class OrdersScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Scheduler');
  private timer: NodeJS.Timeout;
  private running = false;

  constructor(private orders: OrdersService) {}

  onApplicationBootstrap() {
    if (process.env.DISABLE_SCHEDULER === 'true') return;
    setTimeout(() => this.tick(), 10_000);
    this.timer = setInterval(() => this.tick(), 5 * 60_000);
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.orders.runScheduledJobs();
    } catch (e: any) {
      this.log.error(e?.message || e);
    } finally {
      this.running = false;
    }
  }
}
