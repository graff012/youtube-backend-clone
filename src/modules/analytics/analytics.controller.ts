import { Controller, Post, Get, Body, Param, Req, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RecordViewDto } from './dto/record-view.dto';
import { AuthGuard } from '../../common/guard/auth.guard';
import { VideoAnalyticsResponseDto } from './dto/analytics-response.dto';

type Timeframe = '24h' | '7d' | '30d' | '90d' | 'all';

@ApiTags('Analytics')
@Controller('videos')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post(':id/view')
  @ApiOperation({ summary: 'Record a video view' })
  @ApiResponse({ status: 201, description: 'View recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async recordView(
    @Param('id') videoId: string,
    @Body() data: RecordViewDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.analyticsService.recordView(videoId, userId, data);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get video analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Analytics data retrieved successfully',
    type: VideoAnalyticsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoAnalytics(
    @Param('id') videoId: string,
    @Query('timeframe') timeframe: Timeframe = '7d',
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.analyticsService.getVideoAnalytics(videoId, timeframe, userId);
  }
}
