import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ description: 'Title of the video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Description of the video', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Category of the video', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Tags for the video', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ 
    description: 'Visibility status of the video',
    enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'],
    default: 'PRIVATE'
  })
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNLISTED'])
  @IsNotEmpty()
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
}
