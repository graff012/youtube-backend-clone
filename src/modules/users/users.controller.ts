import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Request,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { WatchHistoryResponseDto } from './dto/watch-history-response.dto';
import { Roles } from '../../common/decorators/roles.decorators';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string
  ) {
    // Enforce a maximum limit to prevent excessive data retrieval
    const MAX_LIMIT = 100;
    const safeLimit = Math.min(limit, MAX_LIMIT);

    return this.usersService.findAll(page, safeLimit, search);
  }

  @Get('me')
  @Roles(Role.USER, Role.ADMIN)
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.usersService.findById(req.user.id);
  }

  @Get(':id')
  @Public()
  async getUserById(
    @Param('id') id: string
  ): Promise<Partial<UserResponseDto>> {
    const user = await this.usersService.findById(id);
    // For public access, we'll return only basic user information
    const { email, ...publicUser } = user;
    return publicUser;
  }

  @Put('me')
  @Roles(Role.USER, Role.ADMIN)
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(req.user.id, updateUserDto);
  }

  @Get('me/history')
  async getWatchHistory(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50
  ): Promise<WatchHistoryResponseDto> {
    return this.usersService.getWatchHistory(req.user.id, limit, page);
  }

  @Delete('me/history')
  async clearWatchHistory(@Request() req): Promise<void> {
    return this.usersService.clearWatchHistory(req.user.id);
  }
}
