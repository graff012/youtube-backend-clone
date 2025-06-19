import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    
    const where: Prisma.UserWhereInput = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              subscribers: true,
              subscriptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(user => this.mapToUserResponse(user)),
      total,
      page,
      limit,
      hasMore: skip + users.length < total,
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              subscribers: true,
              subscriptions: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Create update data object with only the fields that are provided
    const updateData: Prisma.UserUpdateInput = {};

    // Handle each field individually to ensure type safety
    if (updateUserDto.email !== undefined) {
      if (updateUserDto.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateUserDto.email },
        });
        if (emailExists) {
          throw new ConflictException('Email already in use');
        }
      }
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.username !== undefined) {
      updateData.username = updateUserDto.username;
    }

    if (updateUserDto.avatar !== undefined) {
      updateData.avatarUrl = updateUserDto.avatar;
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              subscribers: true,
              subscriptions: true,
            },
          },
        },
      });

      return this.mapToUserResponse(updatedUser);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async updateUserRole(userId: string, role: Role, currentUserRole: Role): Promise<UserResponseDto> {
    // Only admins can update roles
    if (currentUserRole !== Role.ADMIN) {
      throw new BadRequestException('Insufficient permissions');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { 
          role: role as any // Type assertion to handle Prisma enum
        },
        include: {
          _count: {
            select: {
              subscribers: true,
              subscriptions: true,
            },
          },
        },
      });

      return this.mapToUserResponse(user);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return new UserResponseDto({
      ...user,
      subscribers_count: user._count?.subscribers || 0,
      subscriptions_count: user._count?.subscriptions || 0,
    });
  }

  async getWatchHistory(
    userId: string,
    limit: number = 50,
    page: number = 1,
  ): Promise<{ items: any[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              duration: true,
            },
          },
        },
        orderBy: { watchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  async clearWatchHistory(userId: string): Promise<void> {
    await this.prisma.watchHistory.deleteMany({
      where: { userId },
    });
  }
}
