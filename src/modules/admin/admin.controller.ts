import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '../../common/guard/auth.guard';
import { RoleGuard } from '../../common/guard/role.guard';
import { Role } from '@prisma/client';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import {
  VideoModerationQueryDto,
  ModerationActionResponseDto,
} from './dto/video-moderation.dto';
import { UserQueryDto, UserActionResponseDto } from './dto/user-management.dto';
import {
  ReportQueryDto,
  ReportActionResponseDto,
} from './dto/content-reports.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
@SetMetadata('roles', [Role.ADMIN])
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns dashboard statistics',
    type: DashboardStatsResponseDto,
  })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('videos/pending')
  @ApiOperation({ summary: 'Get pending videos for moderation' })
  @ApiResponse({ status: 200, description: 'Returns list of pending videos' })
  async getPendingVideos(@Query() query: VideoModerationQueryDto) {
    return this.adminService.getPendingVideos(query);
  }

  @Patch('videos/:id/approve')
  @ApiOperation({ summary: 'Approve a pending video' })
  @ApiResponse({
    status: 200,
    description: 'Video approved successfully',
    type: ModerationActionResponseDto,
  })
  async approveVideo(@Param('id') id: string) {
    return this.adminService.moderateVideo(id, 'approve');
  }

  @Patch('videos/:id/reject')
  @ApiOperation({ summary: 'Reject a pending video' })
  @ApiResponse({
    status: 200,
    description: 'Video rejected successfully',
    type: ModerationActionResponseDto,
  })
  async rejectVideo(@Param('id') id: string) {
    return this.adminService.moderateVideo(id, 'reject');
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/block')
  @ApiOperation({ summary: 'Toggle user block status' })
  @ApiResponse({
    status: 200,
    description: 'User block status toggled successfully',
    type: UserActionResponseDto,
  })
  async toggleUserBlock(@Param('id') id: string) {
    return this.adminService.toggleUserBlock(id);
  }

  @Patch('users/:id/verify')
  @ApiOperation({ summary: 'Verify a user' })
  @ApiResponse({
    status: 200,
    description: 'User verified successfully',
    type: UserActionResponseDto,
  })
  async verifyUser(@Param('id') id: string) {
    return this.adminService.verifyUser(id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get content reports' })
  @ApiResponse({ status: 200, description: 'Returns list of content reports' })
  async getReports(@Query() query: ReportQueryDto) {
    return this.adminService.getReports(query);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve a report' })
  @ApiResponse({
    status: 200,
    description: 'Report resolved successfully',
    type: ReportActionResponseDto,
  })
  async resolveReport(@Param('id') id: string) {
    return this.adminService.resolveReport(id);
  }
}
