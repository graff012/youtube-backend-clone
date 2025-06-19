import { ApiProperty } from '@nestjs/swagger';

class ViewMetric {
  @ApiProperty()
  date: string;

  @ApiProperty()
  views: number;

  @ApiProperty()
  watchTime: number;
}

export class CountryMetric {
  @ApiProperty()
  country: string;

  @ApiProperty()
  views: number;
}

class DeviceBreakdown {
  @ApiProperty()
  mobile: number;

  @ApiProperty()
  desktop: number;

  @ApiProperty()
  tablet: number;
}

class RetentionPoint {
  @ApiProperty()
  time: number;

  @ApiProperty()
  percentage: number;
}

export class VideoAnalyticsResponseDto {
  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  totalWatchTime: number;

  @ApiProperty()
  averageViewDuration: number;

  @ApiProperty({ type: [ViewMetric] })
  viewsByDay: ViewMetric[];

  @ApiProperty({ type: [CountryMetric] })
  viewsByCountry: CountryMetric[];

  @ApiProperty()
  deviceBreakdown: DeviceBreakdown;

  @ApiProperty({ type: [RetentionPoint] })
  retention: RetentionPoint[];
}
