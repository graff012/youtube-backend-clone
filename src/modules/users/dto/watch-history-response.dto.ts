import { Expose, Type } from 'class-transformer';

export class WatchHistoryItemDto {
  @Expose()
  id: string;

  @Expose({ name: 'videoId' })
  video_id: string;

  @Expose()
  video: {
    id: string;
    title: string;
    thumbnail: string | null;
    duration: number;
  };

  @Expose({ name: 'watchedAt' })
  watched_at: Date;

  @Expose({ name: 'watchTime' })
  watch_time: number; // in seconds
}

export class WatchHistoryResponseDto {
  @Expose()
  @Type(() => WatchHistoryItemDto)
  items: WatchHistoryItemDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  hasMore: boolean;
}
