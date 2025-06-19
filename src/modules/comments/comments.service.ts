import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

type CommentWithRelations = Prisma.CommentGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    replies: {
      include: {
        author: {
          select: {
            id: true;
            username: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, userId: string) {
    const { content, videoId, parentId } = createCommentDto;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        likesCount: 0,
        video: {
          connect: { id: videoId },
        },
        author: {
          connect: { id: userId },
        },
        ...(parentId && {
          parent: {
            connect: { id: parentId },
          },
        }),
      },
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

    return {
      ...comment,
      _count: { replies: 0 },
      replies: [],
    };
  }

  async findByVideoId(
    videoId: string,
    pagination: { limit: number; skip: number },
    sort: 'top' | 'newest' = 'newest',
  ): Promise<{ comments: any[]; total: number }> {
    const { limit, skip } = pagination;
    const orderBy: Prisma.CommentOrderByWithRelationInput =
      sort === 'top' ? { likesCount: 'desc' } : { createdAt: 'desc' };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          videoId,
          parentId: null,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.comment.count({
        where: {
          videoId,
          parentId: null,
        },
      }),
    ]);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const [replies, replyCount] = await Promise.all([
          this.prisma.comment.findMany({
            where: { parent: { id: comment.id } },
            take: 3, // Limit to 3 replies
            orderBy: { likesCount: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          }),
          this.prisma.comment.count({ where: { parent: { id: comment.id } } }),
        ]);

        return {
          ...comment,
          _count: { replies: replyCount },
          replies,
        };
      }),
    );

    return { comments: commentsWithReplies, total };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.prisma.like.findFirst({
      where: {
        commentId,
        userId,
        type: 'LIKE',
      },
    });

    if (existingLike) {
      await this.prisma.like.delete({
        where: { id: existingLike.id },
      });

      return this.prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { decrement: 1 },
        },
      });
    }

    const existingDislike = await this.prisma.like.findFirst({
      where: {
        commentId,
        userId,
        type: 'DISLIKE',
      },
    });

    if (existingDislike) {
      await this.prisma.like.update({
        where: { id: existingDislike.id },
        data: { type: 'LIKE' },
      });

      return this.prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { increment: 1 },
          dislikesCount: { decrement: 1 },
        },
      });
    }

    await this.prisma.like.create({
      data: {
        type: 'LIKE',
        comment: { connect: { id: commentId } },
        user: { connect: { id: userId } },
      },
    });

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        likesCount: { increment: 1 },
      },
    });
  }

  async dislikeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingDislike = await this.prisma.like.findFirst({
      where: {
        commentId,
        userId,
        type: 'DISLIKE',
      },
    });

    if (existingDislike) {
      await this.prisma.like.delete({
        where: { id: existingDislike.id },
      });

      return this.prisma.comment.update({
        where: { id: commentId },
        data: {
          dislikesCount: { decrement: 1 },
        },
      });
    }

    const existingLike = await this.prisma.like.findFirst({
      where: {
        commentId,
        userId,
        type: 'LIKE',
      },
    });

    if (existingLike) {
      await this.prisma.like.update({
        where: { id: existingLike.id },
        data: { type: 'DISLIKE' },
      });

      return this.prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { decrement: 1 },
          dislikesCount: { increment: 1 },
        },
      });
    }

    await this.prisma.like.create({
      data: {
        type: 'DISLIKE',
        comment: { connect: { id: commentId } },
        user: { connect: { id: userId } },
      },
    });

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        dislikesCount: { increment: 1 },
      },
    });
  }

  async removeReaction(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.like.deleteMany({
      where: {
        userId,
        commentId,
      },
    });

    const [likesCount, dislikesCount] = await Promise.all([
      this.prisma.like.count({
        where: { commentId, type: 'LIKE' },
      }),
      this.prisma.like.count({
        where: { commentId, type: 'DISLIKE' },
      }),
    ]);

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        likesCount,
        dislikesCount,
      },
    });
  }

  async togglePin(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        video: {
          select: {
            authorId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.video.authorId !== userId) {
      throw new ForbiddenException('Only the video author can pin comments');
    }

    if (comment.isPinned) {
      return this.prisma.comment.update({
        where: { id: commentId },
        data: { isPinned: false },
      });
    }

    await this.prisma.comment.updateMany({
      where: {
        videoId: comment.videoId,
        isPinned: true,
      },
      data: {
        isPinned: false,
      },
    });

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: true },
    });
  }
}
