import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../common/guard/auth.guard';
import { ChannelsService } from './channels.service';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelResponseDto } from './dto/channel-response.dto';
import { ChannelVideosResponseDto } from './dto/channel-response.dto';
import { SubscriptionsResponseDto } from './dto/channel-response.dto';

import { UserPayload } from '../auth/types/request-with-user.type';

declare module 'express' {
  interface Request {
    user?: UserPayload;
  }
}

type SortOption = 'newest' | 'popular';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':username')
  async getChannelInfo(
    @Param('username') username: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; data: ChannelResponseDto }> {
    const userId = req.user?.id;
    const channel = await this.channelsService.getChannelByUsername(
      username,
      userId,
    );
    return {
      success: true,
      data: channel,
    };
  }

  @Get(':username/videos')
  async getChannelVideos(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('sort') sort: SortOption = 'newest',
  ): Promise<{ success: boolean; data: ChannelVideosResponseDto }> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    const data = await this.channelsService.getChannelVideos(
      username,
      limit,
      page,
      sort,
    );

    return {
      success: true,
      data,
    };
  }

  @Put('me')
  @UseGuards(AuthGuard)
  async updateChannel(
    @Req() req: Request,
    @Body() updateData: UpdateChannelDto,
  ): Promise<{ success: boolean; data: ChannelResponseDto }> {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const userId = req.user.id;
    const channel = await this.channelsService.updateChannel(
      userId,
      updateData,
    );
    return {
      success: true,
      data: channel,
    };
  }

  @Post(':userId/subscribe')
  @UseGuards(AuthGuard)
  async subscribe(
    @Param('userId') channelId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; isSubscribed: boolean }> {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const subscriberId = req.user.id;
    const { isSubscribed } = await this.channelsService.toggleSubscribe(
      channelId,
      subscriberId,
    );
    return { success: true, isSubscribed };
  }

  @Delete(':userId/subscribe')
  @UseGuards(AuthGuard)
  async unsubscribe(
    @Param('userId') channelId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; isSubscribed: boolean }> {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const subscriberId = req.user.id;
    const { isSubscribed } = await this.channelsService.toggleSubscribe(
      channelId,
      subscriberId,
    );
    return { success: true, isSubscribed };
  }

  @Get('subscriptions')
  @UseGuards(AuthGuard)
  async getSubscriptions(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ): Promise<{ success: boolean; data: SubscriptionsResponseDto }> {
    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    const data = await this.channelsService.getUserSubscriptions(
      req.user?.id || '',
      limit,
      page,
    );

    return {
      success: true,
      data,
    };
  }
}
