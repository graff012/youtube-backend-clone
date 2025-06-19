import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['PUBLIC', 'PRIVATE', 'UNLISTED'])
  visibility: string = 'PUBLIC';
}

export class AddVideoToPlaylistDto {
  @IsString()
  videoId: string;

  @IsOptional()
  position?: number;
}
