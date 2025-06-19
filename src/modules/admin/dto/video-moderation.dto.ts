import { ApiProperty } from '@nestjs/swagger';

export class VideoModerationQueryDto {
  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;

  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;
}

export class ModerationActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Video approved successfully' })
  message: string;
}
