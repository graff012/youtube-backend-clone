import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecordViewDto {
  @IsInt()
  @IsNotEmpty()
  watchTime: number;

  @IsString()
  @IsNotEmpty()
  quality: string;

  @IsString()
  @IsNotEmpty()
  device: string;

  @IsString()
  @IsOptional()
  location?: string;
}
