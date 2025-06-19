import { Exclude, Expose, Type } from 'class-transformer';

class AuthorDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  avatar: string;
}

class CommentDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose({ name: 'likesCount' })
  likesCount: number;

  @Expose({ name: 'dislikesCount' })
  dislikesCount: number;

  @Expose({ name: 'isPinned' })
  isPinned: boolean;

  @Expose({ name: 'createdAt' })
  createdAt: Date;

  @Expose()
  @Type(() => AuthorDto)
  author: AuthorDto;

  @Expose({ name: 'repliesCount' })
  repliesCount: number;

  @Expose()
  @Type(() => CommentDto)
  replies: CommentDto[];
}

export class CommentResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  data: {
    comments: CommentDto[];
    totalComments: number;
    hasMore: boolean;
  };
}
