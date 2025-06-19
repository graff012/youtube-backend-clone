import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpegPath from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, createReadStream, statSync } from 'fs';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PrismaService } from '../../core/database/prisma.service';

interface VideoStreamResponse {
  stream: NodeJS.ReadableStream;
  headers: Record<string, string | number>;
  fileSize: number;
}

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
  }

  async getVideoResolutions(videoPath: string) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        const video = videoStream;
        resolve({ width: video?.width, height: video?.height });
      });
    });
  }

  convertToResolutions(
    inputPath: string,
    outputBasePath: string,
    resolutions: any,
  ) {
    return new Promise((resolve, reject) => {
      resolutions.forEach((res: { height: number }) => {
        console.log(res);
        const output = `${outputBasePath}/${res.height}p.mp4`;

        ffmpeg(inputPath)
          .videoCodec('libx264')
          .size(`?x${res.height}`)
          .outputOption([`-preset fast`, '-crf 23', '-movflags +faststart'])
          .on('end', () => {
            console.log(`${res.height} created`);
            resolve('one ended');
          })
          .on('progress', (progress) => {
            const showProgress = `${Math.floor(progress.percent as number)}%`;
            console.log(showProgress);
          })
          .on('error', (err) => {
            console.error(err);
          })
          .save(output);
      });
    });
  }

  async uploadVideo(
    file: Express.Multer.File,
    createVideoDto: CreateVideoDto,
    userId: string,
  ) {
    try {
      const video = await this.prisma.video.create({
        data: {
          title: createVideoDto.title,
          description: createVideoDto.description,
          videoUrl: '', // Will be updated after processing
          thumbnail: '', // Will be updated after thumbnail processing
          duration: 0, // Will be updated after processing
          viewsCount: 0n,
          likesCount: 0,
          dislikesCount: 0,
          visibility: createVideoDto.visibility,
          authorId: userId,
          status: 'PROCESSING',
        },
      });

      // Process video in the background
      this.processVideo(file, video.id, userId);

      return {
        success: true,
        message: 'Video uploaded successfully, processing started',
        data: {
          id: video.id,
          title: video.title,
          status: 'PROCESSING',
          uploadProgress: 100,
          processingProgress: 0,
          estimatedProcessingTime: '5-10 minutes',
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload video');
    }
  }

  async getVideoStatus(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // In a real app, you might want to track processing progress separately
    const isProcessed = video.status === 'PUBLISHED';

    return {
      success: true,
      data: {
        id: video.id,
        status: video.status,
        processingProgress: isProcessed ? 100 : 50, // Example progress
        availableQualities: ['1080p', '720p', '480p'], // Static for now
        estimatedTimeRemaining: isProcessed ? '0 minutes' : '2 minutes',
      },
    };
  }

  async getVideoDetails(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            _count: {
              select: { subscribers: true },
            },
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Get comments count separately since it's not included in the video model
    const commentsCount = await this.prisma.comment.count({
      where: { videoId: id },
    });

    return {
      success: true,
      data: {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        videoUrl: video.videoUrl,
        availableQualities: ['1080p', '720p', '480p'], // Static for now
        duration: video.duration,
        viewsCount: Number(video.viewsCount),
        likesCount: video.likesCount,
        dislikesCount: video.dislikesCount,
        commentsCount,
        publishedAt: video.createdAt.toISOString(),
        author: {
          id: video.author.id,
          username: video.author.username,
          channelName:
            `${video.author.firstName} ${video.author.lastName}`.trim(),
          avatar: video.author.avatarUrl,
          subscribersCount: video.author._count?.subscribers || 0,
          isVerified: video.author.role === 'ADMIN',
        },
        visibility: video.visibility,
        status: video.status,
      },
    };
  }

  async streamVideo(id: string, range: string): Promise<VideoStreamResponse> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { videoUrl: true, duration: true },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const videoPath = path.join(process.cwd(), video.videoUrl);

    if (!existsSync(videoPath)) {
      throw new NotFoundException('Video file not found');
    }

    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const { start, end, chunkSize } = this.parseRange(range, fileSize);

    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    const videoStream = createReadStream(videoPath, { start, end });

    return {
      stream: videoStream,
      headers,
      fileSize,
    };
  }

  async updateVideo(
    id: string,
    updateVideoDto: UpdateVideoDto,
    userId: string,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.authorId !== userId) {
      throw new BadRequestException(
        'You are not authorized to update this video',
      );
    }

    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data: {
        title: updateVideoDto.title || video.title,
        description: updateVideoDto.description || video.description,
        visibility: updateVideoDto.visibility || video.visibility,
      },
    });

    return {
      success: true,
      data: updatedVideo,
    };
  }

  async deleteVideo(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.authorId !== userId) {
      throw new BadRequestException(
        'You are not authorized to delete this video',
      );
    }

    try {
      if (video.videoUrl) {
        const videoDir = path.dirname(video.videoUrl);
        if (existsSync(videoDir)) {
          await fs.rm(videoDir, { recursive: true, force: true });
        }
      }

      await this.prisma.video.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Video deleted successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete video');
    }
  }

  private parseRange(range: string, fileSize: number) {
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);
    const chunkSize = end - start + 1;
    return { start, end, chunkSize };
  }

  private async processVideo(
    file: Express.Multer.File,
    videoId: string,
    userId: string,
  ) {
    try {
      const fileName = file.filename;
      const videoPath = path.join(process.cwd(), 'uploads', fileName);
      const outputDir = path.join(process.cwd(), 'uploads', 'videos', videoId);

      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration || 0;

      await this.generateThumbnail(videoPath, outputDir);

      const resolutions = [
        { height: 1080 },
        { height: 720 },
        { height: 480 },
        { height: 360 },
      ];
      await this.convertToResolutions(videoPath, outputDir, resolutions);

      await fs.unlink(videoPath);

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          videoUrl: path.join('videos', videoId, '1080p.mp4'),
          thumbnail: path.join('videos', videoId, 'thumbnail.jpg'),
          duration: Math.round(duration),
          status: 'PUBLISHED',
        },
      });
    } catch (error) {
      console.error('Error processing video:', error);
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'DELETED' },
      });
    }
  }

  private async generateThumbnail(videoPath: string, outputDir: string) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['50%'],
          filename: 'thumbnail.jpg',
          folder: outputDir,
          size: '1280x720',
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  private async getVideoMetadata(
    videoPath: string,
  ): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });
  }

  async watchVideo(
    id: string,
    range?: string,
  ): Promise<{
    file: Buffer;
    start?: number;
    end?: number;
    chunksize?: number;
    fileSize: number;
    headers: Record<string, string | number>;
  }> {
    const videoDir = path.join(process.cwd(), 'uploads', 'videos', id);

    if (!existsSync(videoDir)) {
      throw new NotFoundException('Video not found');
    }

    const files = await fs.readdir(videoDir);

    const qualities = ['1080', '720', '480', '360', '240'];
    let videoFile = '';

    for (const quality of qualities) {
      const file = files.find((f) => f.endsWith(`${quality}p.mp4`));
      if (file) {
        videoFile = path.join(videoDir, file);
        break;
      }
    }

    if (!videoFile) {
      const mp4File = files.find((f) => f.endsWith('.mp4'));
      if (mp4File) {
        videoFile = path.join(videoDir, mp4File);
      } else {
        throw new NotFoundException('No playable video found');
      }
    }

    const stat = await fs.stat(videoFile);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileHandle = await fs.open(videoFile, 'r');
      const buffer = Buffer.alloc(chunksize);
      await fileHandle.read(buffer, 0, chunksize, start);
      await fileHandle.close();

      return {
        file: buffer,
        start,
        end,
        chunksize,
        fileSize,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        },
      };
    } else {
      const file = await fs.readFile(videoFile);
      return {
        file,
        fileSize,
        headers: {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        },
      };
    }
  }
}
