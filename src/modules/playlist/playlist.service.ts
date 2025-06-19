import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddVideoToPlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { Prisma, Visibility } from '@prisma/client';

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  async create(createPlaylistDto: CreatePlaylistDto, authorId: string) {
    const data: Prisma.PlaylistCreateInput = {
      title: createPlaylistDto.title,
      description: createPlaylistDto.description,
      visibility: createPlaylistDto.visibility as Visibility,
      author: {
        connect: { id: authorId },
      },
    };

    return this.prisma.playlist.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        playlistVideo: {
          include: {
            video: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async addVideo(
    playlistId: string,
    addVideoToPlaylistDto: AddVideoToPlaylistDto,
    authorId: string,
  ) {
    // Verify playlist exists and user is the owner
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { authorId: true },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.authorId !== authorId)
      throw new ForbiddenException('Not your playlist');

    const video = await this.prisma.video.findUnique({
      where: { id: addVideoToPlaylistDto.videoId },
      select: { id: true },
    });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.playlistVideo.findFirst({
      where: {
        playlistId,
        videoId: addVideoToPlaylistDto.videoId,
      },
      select: { id: true, videoId: true, position: true },
    });

    if (existing) {
      const videoWithDetails = await this.prisma.playlistVideo.findUnique({
        where: { id: existing.id },
        include: {
          video: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
      return videoWithDetails;
    }

    const position =
      addVideoToPlaylistDto.position ??
      (await this.prisma.playlistVideo.count({
        where: { playlistId },
      }));

    const created = await this.prisma.playlistVideo.create({
      data: {
        playlist: { connect: { id: playlistId } },
        video: { connect: { id: addVideoToPlaylistDto.videoId } },
        position,
      },
      include: {
        video: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return created;
  }

  async findOne(id: string, userId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');

    if (playlist.visibility === 'PRIVATE' && playlist.authorId !== userId) {
      throw new ForbiddenException('This playlist is private');
    }

    const [videos, videoCount] = await Promise.all([
      this.prisma.playlistVideo.findMany({
        where: { playlistId: id },
        include: {
          video: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      }),
      this.prisma.playlistVideo.count({
        where: { playlistId: id },
      }),
    ]);

    const videoDetails = videos.map((pv) => pv.video);

    return {
      ...playlist,
      videos: videoDetails,
      videosCount: videoCount,
    };
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    isOwner: boolean = false,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PlaylistWhereInput = { authorId: userId };

    if (!isOwner) {
      where.visibility = 'PUBLIC';
    }

    const total = await this.prisma.playlist.count({ where });

    const playlists = await this.prisma.playlist.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const playlistIds = playlists.map((p) => p.id);

    const [videoCounts, firstVideos] = await Promise.all([
      this.prisma.playlistVideo.groupBy({
        by: ['playlistId'],
        where: { playlistId: { in: playlistIds } },
        _count: { _all: true },
      }),

      this.prisma.playlistVideo.findMany({
        where: {
          playlistId: { in: playlistIds },
          position: 0,
        },
        select: {
          playlistId: true,
          video: {
            select: {
              thumbnail: true,
            },
          },
        },
      }),
    ]);

    const videoCountMap = new Map(
      videoCounts.map((vc) => [vc.playlistId, vc._count._all]),
    );

    const thumbnailMap = new Map(
      firstVideos.map((fv) => [fv.playlistId, fv.video.thumbnail]),
    );

    const items = playlists.map((playlist) => ({
      ...playlist,
      videosCount: videoCountMap.get(playlist.id) || 0,
      thumbnail: thumbnailMap.get(playlist.id) || null,
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    updatePlaylistDto: UpdatePlaylistDto,
    authorId: string,
  ) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.authorId !== authorId)
      throw new ForbiddenException('Not your playlist');

    const updateData: Prisma.PlaylistUpdateInput = {
      title: updatePlaylistDto.title,
      description: updatePlaylistDto.description,
    };

    if (updatePlaylistDto.visibility) {
      updateData.visibility = updatePlaylistDto.visibility as Visibility;
    }

    return this.prisma.playlist.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        playlistVideo: {
          include: {
            video: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async removeVideo(playlistId: string, videoId: string, authorId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { author: true },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.authorId !== authorId)
      throw new ForbiddenException('Not your playlist');

    const playlistVideo = await this.prisma.playlistVideo.findFirst({
      where: {
        playlistId,
        videoId,
      },
    });

    if (!playlistVideo) {
      throw new NotFoundException('Video not found in playlist');
    }

    await this.prisma.playlistVideo.delete({
      where: { id: playlistVideo.id },
    });

    return { success: true };
  }

  async remove(id: string, authorId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.authorId !== authorId)
      throw new ForbiddenException('Not your playlist');

    await this.prisma.playlistVideo.deleteMany({
      where: { playlistId: id },
    });

    await this.prisma.playlist.delete({ where: { id } });

    return { success: true };
  }
}
