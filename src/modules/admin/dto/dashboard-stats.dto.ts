import { ApiProperty } from '@nestjs/swagger';

class CategoryStatsDto {
  @ApiProperty({ example: 'Entertainment' })
  category: string;

  @ApiProperty({ example: 50000 })
  count: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalVideos: number;

  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  totalWatchTime: number;

  @ApiProperty()
  newUsersToday: number;

  @ApiProperty()
  newVideosToday: number;

  @ApiProperty()
  viewsToday: number;

  @ApiProperty({ type: [CategoryStatsDto] })
  topCategories: CategoryStatsDto[];

  @ApiProperty({ example: '500TB' })
  storageUsed: string;

  @ApiProperty({ example: '50TB' })
  bandwidthUsed: string;
}
