import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query, 
  DefaultValuePipe, 
  ParseIntPipe,
  Request
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guard/auth.guard';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto, AddVideoToPlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new playlist' })
  @ApiResponse({ status: 201, description: 'Playlist created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createPlaylistDto: CreatePlaylistDto,
    @Request() req
  ) {
    return this.playlistService.create(createPlaylistDto, req.user.id);
  }

  @Post(':id/videos')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add video to playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({ status: 201, description: 'Video added to playlist' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Playlist or video not found' })
  async addVideo(
    @Param('id') playlistId: string,
    @Body() addVideoDto: AddVideoToPlaylistDto,
    @Request() req
  ) {
    await this.playlistService.addVideo(playlistId, addVideoDto, req.user.id);
    return { success: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist by ID' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({ status: 200, description: 'Returns the playlist' })
  @ApiResponse({ status: 403, description: 'Forbidden - Playlist is private' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req
  ) {
    const userId = req.user?.id;
    return this.playlistService.findOne(id, userId);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user playlists' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user playlists' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Request() req
  ) {
    // Only return private playlists if requested by the owner
    const isOwner = req.user?.id === userId;
    return this.playlistService.findByUser(userId, page, limit, isOwner);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({ status: 200, description: 'Playlist updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
    @Request() req
  ) {
    return this.playlistService.update(id, updatePlaylistDto, req.user.id);
  }

  @Delete(':id/videos/:videoId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove video from playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiResponse({ status: 200, description: 'Video removed from playlist' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Playlist or video not found' })
  async removeVideo(
    @Param('id') playlistId: string,
    @Param('videoId') videoId: string,
    @Request() req
  ) {
    return this.playlistService.removeVideo(playlistId, videoId, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({ status: 200, description: 'Playlist deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async remove(
    @Param('id') id: string,
    @Request() req
  ) {
    return this.playlistService.remove(id, req.user.id);
  }
}
