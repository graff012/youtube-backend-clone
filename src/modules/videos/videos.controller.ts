import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  InternalServerErrorException,
  BadRequestException,
  Get,
  Param,
  Headers,
  Res,
  NotFoundException,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'path';
import { VideosService } from './videos.service';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { AuthGuard } from '../../common/guard/auth.guard';

@Controller('videos')
@UseGuards(AuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: async (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads');
          try {
            if (!existsSync(uploadDir)) {
              await fs.mkdir(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
          } catch (error) {
            cb(error as Error, uploadDir);
          }
        },
        filename: (req, file, callback) => {
          const mimeType = path.extname(file.originalname);
          const filename = `${Date.now()}${mimeType}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = [
          '.mp4',
          '.mov',
          '.avi',
          '.wmv',
          '.flv',
          '.mkv',
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return cb(
            new BadRequestException(
              'Only video files (mp4, mov, avi, wmv, flv, mkv) are allowed!'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 500, // 500MB limit
      },
    })
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() createVideoDto: CreateVideoDto,
    @Req() req: Request & { user: { id: string } }
  ) {
    if (!file) {
      throw new BadRequestException('No video file uploaded');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.videosService.uploadVideo(file, createVideoDto, userId);
  }

  @Public()
  @Get('status/:id')
  async getVideoStatus(@Param('id') id: string) {
    return this.videosService.getVideoStatus(id);
  }

  @Public()
  @Get(':id')
  async getVideoDetails(@Param('id') id: string) {
    return this.videosService.getVideoDetails(id);
  }

  @Public()
  @Get('stream/:id')
  async streamVideo(
    @Param('id') id: string,
    @Headers('range') range: string,
    @Res() res: Response
  ) {
    if (!range) {
      throw new BadRequestException('Range header is required');
    }

    try {
      const { stream, headers, fileSize } =
        await this.videosService.streamVideo(id, range);

      res.writeHead(206, headers);

      const videoStream = stream.pipe(res);

      return new Promise((resolve, reject) => {
        videoStream.on('finish', resolve);
        videoStream.on('error', reject);
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error streaming video');
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async updateVideo(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Req() req: Request & { user: { id: string } }
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.videosService.updateVideo(id, updateVideoDto, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteVideo(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } }
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.videosService.deleteVideo(id, userId);
  }

  @Public()
  @Get('watch/:id')
  async watchVideo(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response
  ) {
    try {
      const videoData = await this.videosService.watchVideo(id, range);

      Object.entries(videoData.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (range) {
        res.status(206);
      }

      return res.end(videoData.file);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error streaming video');
    }
  }
}
