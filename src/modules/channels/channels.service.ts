import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ChannelResponseDto,
  UpdateChannelDto,
  ChannelVideosResponseDto,
  SubscriptionsResponseDto,
} from './dto/channel-response.dto';
import { VideoStatus, Visibility } from '@prisma/client';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async getChannelByUsername(
    username: string,
    currentUserId?: string,
  ): Promise<ChannelResponseDto> {
    const [user, videos] = await Promise.all([
      this.prisma.user.findUnique({
        where: { username },
        include: {
          _count: {
            select: {
              video: true,
              subscribers: true,
            },
          },
        },
      }),
      this.prisma.video.findMany({
        where: {
          author: { username },
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
        },
        select: {
          viewsCount: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Channel not found');
    }

    const totalViews = videos.reduce(
      (sum, video) => sum + (Number(video.viewsCount) || 0),
      0,
    );

    let isSubscribed = false;
    if (currentUserId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: {
          subscriberId_channelId: {
            subscriberId: currentUserId,
            channelId: user.id,
          },
        },
      });
      isSubscribed = !!subscription;
    }

    return {
      id: user.id,
      username: user.username,
      channelName: user.firstName + ' ' + user.lastName,
      channelDescription: '',
      avatar: user.avatarUrl || undefined,
      subscribersCount: user._count?.subscribers || 0,
      totalViews,
      videosCount: user._count?.video || 0,
      joinedAt: user.createdAt,
      isVerified: user.is_email_verified || false,
      isSubscribed,
    };
  }

  async getChannelVideos(
    username: string,
    limit = 20,
    page = 1,
    sort: 'newest' | 'popular' = 'newest',
  ): Promise<ChannelVideosResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('Channel not found');
    }

    const skip = (page - 1) * limit;
    const orderBy =
      sort === 'newest'
        ? { createdAt: 'desc' as const }
        : { viewsCount: 'desc' as const };

    const where = {
      authorId: user.id,
      status: 'PUBLISHED' as VideoStatus,
      visibility: 'PUBLIC' as Visibility,
    };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.video.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const formattedVideos = videos.map((video) => ({
      ...video,
      author: {
        id: video.authorId,
        username: video.author?.username || '',
        firstName: video.author?.firstName || '',
        lastName: video.author?.lastName || '',
        avatar: video.author?.avatarUrl || undefined,
        channelName:
          `${video.author?.firstName || ''} ${video.author?.lastName || ''}`.trim() ||
          video.author?.username ||
          '',
      },
      views: Number(video.viewsCount),
    }));

    return {
      videos: formattedVideos as any,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateChannel(
    userId: string,
    updateData: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    const nameParts = updateData.channelName?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        ...(updateData.avatar && { avatarUrl: updateData.avatar }),
      },
    });

    return this.getChannelByUsername(user.username, userId);
  }

  async toggleSubscribe(
    channelId: string,
    subscriberId: string,
  ): Promise<{ isSubscribed: boolean }> {
    if (channelId === subscriberId) {
      throw new BadRequestException('Cannot subscribe to your own channel');
    }

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: {
        subscriberId_channelId: {
          subscriberId,
          channelId,
        },
      },
    });

    if (existingSubscription) {
      await this.prisma.subscription.delete({
        where: {
          subscriberId_channelId: {
            subscriberId,
            channelId,
          },
        },
      });
      return { isSubscribed: false };
    } else {
      await this.prisma.subscription.create({
        data: {
          subscriberId,
          channelId,
        },
      });
      return { isSubscribed: true };
    }
  }

  async getUserSubscriptions(
    userId: string,
    limit = 20,
    page = 1,
  ): Promise<SubscriptionsResponseDto> {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { subscriberId: userId },
        include: {
          channel: {
            include: {
              _count: {
                select: {
                  subscribers: true,
                  video: {
                    where: {
                      status: 'PUBLISHED',
                      visibility: 'PUBLIC',
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: limit,
        skip,
      }),
      this.prisma.subscription.count({
        where: { subscriberId: userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      subscriptions: subscriptions.map((sub) => {
        const channel = sub.channel;
        const videoCount = channel._count?.video || 0;

        return {
          id: channel.id,
          username: channel.username,
          channelName:
            `${channel.firstName} ${channel.lastName}`.trim() ||
            channel.username,
          channelDescription: '',
          avatar: channel.avatarUrl || null,
          subscribersCount: channel._count?.subscribers || 0,
          videosCount: videoCount,
          joinedAt: channel.createdAt,
          isVerified: channel.is_email_verified || false,
        };
      }),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
