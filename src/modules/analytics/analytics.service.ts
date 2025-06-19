import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RecordViewDto } from './dto/record-view.dto';
import {
  VideoAnalyticsResponseDto,
  CountryMetric,
} from './dto/analytics-response.dto';

type Timeframe = '24h' | '7d' | '30d' | '90d' | 'all';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async recordView(videoId: string, userId: string, data: RecordViewDto) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        viewsCount: { increment: 1 },
      },
    });

    await this.prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: {
        userId,
        videoId,
        watchTime: data.watchTime,
      },
      update: {
        watchedAt: new Date(),
        watchTime: data.watchTime,
      },
    });

    await this.prisma.analytics.create({
      data: {
        videoId,
        userId,
        watchTime: data.watchTime,
        quality: data.quality,
        device: data.device,
        location: data.location,
      },
    });

    return { success: true, message: 'View recorded successfully' };
  }

  async getVideoAnalytics(
    videoId: string,
    timeframe: Timeframe = '7d',
    userId: string,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { authorId: true },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.authorId !== userId) {
      throw new BadRequestException(
        'You are not authorized to view these analytics',
      );
    }

    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
      default:
        startDate = new Date(0);
    }

    const [
      totalViews,
      totalWatchTime,
      viewsByDay,
      viewsByCountry,
      deviceBreakdown,
      retention,
    ] = await Promise.all([
      this.prisma.analytics.count({
        where: {
          videoId,
          createdAt: { gte: startDate },
        },
      }),

      this.prisma.analytics.aggregate({
        where: {
          videoId,
          createdAt: { gte: startDate },
        },
        _sum: {
          watchTime: true,
        },
      }),

      this.prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date, 
          COUNT(*) as views,
          SUM("watchTime") as "watchTime"
        FROM "Analytics"
        WHERE "videoId" = ${videoId} 
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      this.prisma.$queryRaw`
        SELECT 
          "location" as country, 
          COUNT(*) as views
        FROM "Analytics"
        WHERE "videoId" = ${videoId} 
          AND "createdAt" >= ${startDate}
          AND "location" IS NOT NULL
        GROUP BY "location"
        ORDER BY views DESC
        LIMIT 10
      `,

      this.prisma.analytics.groupBy({
        by: ['device'],
        where: {
          videoId,
          createdAt: { gte: startDate },
        },
        _count: true,
      }),

      Promise.resolve([
        { time: 0, percentage: 100 },
        { time: 30, percentage: 85 },
        { time: 60, percentage: 70 },
        { time: 120, percentage: 50 },
        { time: 180, percentage: 30 },
      ]),
    ]);

    const deviceData = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    };

    deviceBreakdown.forEach((item) => {
      const device = item.device.toLowerCase();
      if (device.includes('mobile')) {
        deviceData.mobile = item._count;
      } else if (device.includes('tablet')) {
        deviceData.tablet = item._count;
      } else {
        deviceData.desktop = item._count;
      }
    });

    const totalDevices = Object.values(deviceData).reduce((a, b) => a + b, 1);
    const deviceBreakdownPercent = {
      mobile: Math.round((deviceData.mobile / totalDevices) * 100),
      desktop: Math.round((deviceData.desktop / totalDevices) * 100),
      tablet: Math.round((deviceData.tablet / totalDevices) * 100),
    };

    const averageViewDuration =
      totalViews > 0
        ? Math.round((totalWatchTime._sum.watchTime || 0) / totalViews)
        : 0;

    const response: VideoAnalyticsResponseDto = {
      totalViews,
      totalWatchTime: totalWatchTime._sum.watchTime || 0,
      averageViewDuration,
      viewsByDay: (
        viewsByDay as Array<{ date: Date; views: bigint; watchTime: bigint }>
      ).map((item) => ({
        date: item.date.toISOString().split('T')[0],
        views: Number(item.views),
        watchTime: Number(item.watchTime) || 0,
      })),
      viewsByCountry: (
        viewsByCountry as Array<{ country: string; views: bigint }>
      ).map((item) => ({
        country: item.country,
        views: Number(item.views),
      })),
      deviceBreakdown: deviceBreakdownPercent,
      retention: retention as any,
    };

    return {
      success: true,
      data: response,
    };
  }
}
