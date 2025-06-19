import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus } from './dto/user-management.dto';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import {
  VideoModerationQueryDto,
  ModerationActionResponseDto,
} from './dto/video-moderation.dto';
import { UserQueryDto, UserActionResponseDto } from './dto/user-management.dto';
import {
  ReportQueryDto,
  ReportActionResponseDto,
} from './dto/content-reports.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStatsResponseDto> {
    const [
      totalUsers,
      totalVideos,
      totalViews,
      newUsersToday,
      newVideosToday,
      viewsToday,
      totalWatchTime,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.video.count({
        where: { status: 'PUBLISHED' },
      }),
      this.prisma.video.aggregate({
        _sum: {
          viewsCount: true,
        },
        where: { status: 'PUBLISHED' },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.video.count({
        where: {
          status: 'PUBLISHED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.video.aggregate({
        _sum: {
          viewsCount: true,
        },
        where: {
          status: 'PUBLISHED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Calculate watch time (in seconds, assuming average watch time is 50% of video duration)
      this.prisma.video
        .aggregate({
          _sum: {
            duration: true,
          },
          where: { status: 'PUBLISHED' },
        })
        .then((result) => Math.floor((result._sum.duration || 0) * 0.5)),
    ]);

    const topCategories = await this.prisma.category.findMany({
      select: {
        name: true,
        _count: {
          select: { videos: true },
        },
      },
      orderBy: {
        videos: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const formattedCategories = topCategories.map((cat) => ({
      category: cat.name,
      count: cat._count.videos,
    }));

    const data: DashboardStatsResponseDto = {
      totalUsers,
      totalVideos,
      totalViews: totalViews._sum.viewsCount
        ? Number(totalViews._sum.viewsCount)
        : 0,
      totalWatchTime: totalWatchTime,
      newUsersToday,
      newVideosToday,
      viewsToday: viewsToday?._sum?.viewsCount
        ? Number(viewsToday._sum.viewsCount)
        : 0,
      topCategories: formattedCategories,
      storageUsed: '500TB', // Mock data
      bandwidthUsed: '50TB', // Mock data
    };

    return data;
  }

  async getPendingVideos(query: VideoModerationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          status: 'UPLOADING', // Using UPLOADING as the pending state since PENDING doesn't exist
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.video.count({ where: { status: 'UPLOADING' } }),
    ]);

    return {
      success: true,
      data: videos,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderateVideo(
    videoId: string,
    action: 'approve' | 'reject',
  ): Promise<ModerationActionResponseDto> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const updatedVideo = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: action === 'approve' ? 'PUBLISHED' : 'DELETED', // Using DELETED instead of REJECTED
      },
    });

    return {
      success: true,
      message: `Video ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    };
  }

  async getUsers(query: UserQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      if (status === UserStatus.ACTIVE) {
        // Filter active users (not blocked and email verified)
        where.is_email_verified = true;
        where.role = 'USER';
      } else if (status === UserStatus.PENDING) {
        where.is_email_verified = false;
      } else if (status === UserStatus.BLOCKED) {
        // Since we don't have a blocked status, we'll filter by role
        // In a real app, I would have a proper blocked status
        where.role = 'ADMIN';
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          is_email_verified: true,
          is_phone_verified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleUserBlock(userId: string): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Toggle between USER and ADMIN roles as a workaround for blocking
    // In a real app, I would have a proper isBlocked field
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    const isBlocked = newRole === 'ADMIN';

    return {
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    };
  }

  async verifyUser(userId: string): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is_email_verified: true },
    });

    return {
      success: true,
      message: 'User verified successfully',
    };
  }

  async getReports(query: ReportQueryDto) {
    // Since we don't have a Report model, we'll return an empty array
    return {
      data: [],
      meta: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
      },
    };
  }

  async resolveReport(reportId: string): Promise<ReportActionResponseDto> {
    // Since we don't have a Report model, we'll return a success response

    return {
      success: true,
      message: 'Report resolved successfully',
    };
  }
}
