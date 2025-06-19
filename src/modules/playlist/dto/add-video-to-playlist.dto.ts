import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AddVideoToPlaylistDto {
  @IsString()
  videoId: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}
