import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from '../../common/guard/auth.guard';
import { CommentResponseDto } from './dto/comment-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('comments')
@Controller('videos')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post(':videoId/comments')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment or reply' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Video or parent comment not found',
  })
  async createComment(
    @Param('videoId') videoId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    const comment = await this.commentsService.create(
      { ...createCommentDto, videoId },
      userId,
    );

    return {
      success: true,
      data: {
        ...comment,
        dislikesCount: 0,
        isPinned: false,
        repliesCount: 0,
        replies: [],
        author: {
          id: comment.authorId,
          username: comment.author?.username || 'Unknown',
          avatar: comment.author?.avatarUrl || '',
        },
      },
    };
  }

  @Get(':videoId/comments')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get paginated comments for a video' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated comments',
    type: [CommentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({
    status: 404,
    description: 'Video or parent comment not found',
  })
  async getComments(
    @Param('videoId') videoId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('sort') sort: 'top' | 'newest' = 'newest',
  ) {
    const skip = (page - 1) * limit;
    const { comments, total } = await this.commentsService.findByVideoId(
      videoId,
      { limit, skip },
      sort,
    );

    const mappedComments = comments.map((comment) => ({
      ...comment,
      dislikesCount: comment.dislikesCount || 0,
      isPinned: comment.isPinned || false,
      repliesCount: comment._count?.replies || 0,
      replies: (comment.replies || []).map((reply) => ({
        ...reply,
        dislikesCount: reply.dislikesCount || 0,
        isPinned: reply.isPinned || false,
        repliesCount: 0,
        author: {
          id: reply.authorId,
          username: reply.author?.username || 'Unknown',
          avatar: reply.author?.avatarUrl || '',
        },
      })),
      author: {
        id: comment.authorId,
        username: comment.author?.username || 'Unknown',
        avatar: comment.author?.avatarUrl || '',
      },
    }));

    return {
      success: true,
      data: {
        comments: mappedComments,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Post('comments/:id/like')
  @UseGuards(AuthGuard)
  async likeComment(@Param('id') id: string, @Request() req) {
    await this.commentsService.likeComment(id, req.user.userId);
    return { success: true };
  }

  @Post('comments/:id/dislike')
  @UseGuards(AuthGuard)
  async dislikeComment(@Param('id') id: string, @Request() req) {
    await this.commentsService.dislikeComment(id, req.user.userId);
    return { success: true };
  }

  @Delete('comments/:id/like')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async removeLike(@Param('id') id: string, @Request() req) {
    await this.commentsService.removeReaction(id, req.user.userId);
    return { success: true };
  }

  @Patch(':id/pin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not the comment author',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async togglePinComment(@Param('id') commentId: string, @Request() req: any) {
    return this.commentsService.togglePin(commentId, req.user.id);
  }
}
