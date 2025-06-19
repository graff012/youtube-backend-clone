import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoStatus, Visibility } from '@prisma/client';

class VideoAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty()
  channelName: string;
}

export class VideoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  thumbnail?: string;

  @ApiProperty()
  videoUrl: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ enum: VideoStatus })
  status: VideoStatus;

  @ApiProperty({ enum: Visibility })
  visibility: Visibility;

  @ApiProperty()
  views: number;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  dislikesCount: number;

  @ApiProperty()
  author: VideoAuthorDto;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  createdAt: Date;
}

class SubscriptionChannelDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  is_email_verified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  _count: {
    subscribers: number;
    video: number;
  };
}

export class ChannelResponseDto {
  @ApiProperty({ description: 'Unique identifier of the channel' })
  id: string;

  @ApiProperty({ description: 'Username of the channel owner' })
  username: string;

  @ApiProperty({ description: 'Display name of the channel' })
  channelName: string;

  @ApiProperty({ description: 'Description of the channel', required: false })
  channelDescription?: string;

  @ApiPropertyOptional({ description: 'URL to the channel avatar' })
  avatar?: string | null;

  @ApiPropertyOptional({ description: 'URL to the channel banner' })
  channelBanner?: string | null;

  @ApiProperty({ description: 'Number of subscribers' })
  subscribersCount: number;

  @ApiProperty({ description: 'Total number of views across all videos' })
  totalViews: number;

  @ApiProperty({ description: 'Total number of videos on the channel' })
  videosCount: number;

  @ApiProperty({ description: 'Date when the channel was created' })
  joinedAt: Date;

  @ApiProperty({ description: 'Whether the channel is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether the current user is subscribed to this channel' })
  isSubscribed: boolean;
}

export class ChannelVideosResponseDto {
  @ApiProperty({ description: 'List of videos', type: [VideoDto] })
  videos: VideoDto[];

  @ApiProperty({ description: 'Total number of videos' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class UpdateChannelDto {
  @ApiPropertyOptional({ description: 'New channel name' })
  channelName?: string;

  @ApiPropertyOptional({ description: 'New channel description' })
  channelDescription?: string;

  @ApiPropertyOptional({ description: 'URL to new channel banner' })
  channelBanner?: string;

  @ApiPropertyOptional({ description: 'URL to new avatar' })
  avatar?: string;
}

export class SubscriptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  channelName: string;

  @ApiProperty()
  channelDescription: string;

  @ApiPropertyOptional()
  avatar?: string | null;

  @ApiPropertyOptional()
  channelBanner?: string | null;

  @ApiProperty()
  subscribersCount: number;

  @ApiProperty()
  videosCount: number;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty()
  isVerified: boolean;
}

export class SubscriptionsResponseDto {
  @ApiProperty({ description: 'List of subscriptions', type: [SubscriptionDto] })
  subscriptions: SubscriptionDto[];

  @ApiProperty({ description: 'Total number of subscriptions' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
