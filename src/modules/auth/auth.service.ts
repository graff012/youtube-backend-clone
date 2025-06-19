import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  RegisterDto,
  LoginDto,
  VerifyLoginDto,
  AuthResponseDto,
  OtpPurpose,
} from './dto/create-auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../core/database/redis.service';
import { PrismaService } from '../../core/database/prisma.service';

interface User {
  id: string;
  email: string;
  phoneNumber: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ sub: userId, email }, { expiresIn: '15m' }),
      this.jwtService.signAsync({ sub: userId, email }, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  private deserializeUser(data: Record<string, string>): User {
    return {
      id: data.id,
      email: data.email,
      phoneNumber: data.phoneNumber,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      is_phone_verified: data.is_phone_verified === 'true',
      is_email_verified: data.is_email_verified === 'true',
      refreshToken: data.refreshToken,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private async cacheUser(user: any): Promise<void> {
    const userData = {
      id: user.id,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: user.auth?.password || '',
      is_phone_verified: user.is_phone_verified ? 'true' : 'false',
      is_email_verified: user.is_email_verified ? 'true' : 'false',
      role: user.role || 'USER',
      avatarUrl: user.avatarUrl || '',
      refreshToken: user.refreshToken || '',
      createdAt: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setUser(user.id, userData);
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const [existingUserByEmail, existingUserByPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: registerDto.email } }),
      this.prisma.user.findUnique({
        where: { phoneNumber: registerDto.phoneNumber },
      }),
    ]);

    if (existingUserByEmail) {
      throw new ConflictException('Email already in use');
    }

    if (existingUserByPhone) {
      throw new ConflictException('Phone number already in use');
    }

    const baseUsername = registerDto.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${baseUsername}${randomSuffix}`;

    const hashedPassword = await this.hashPassword(registerDto.password);
    const userId = uuidv4();
    const firstName = registerDto.firstName;
    const lastName = registerDto.lastName;

    let user;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        user = await this.prisma.user.create({
          data: {
            id: userId,
            email: registerDto.email,
            phoneNumber: registerDto.phoneNumber,
            username:
              attempts > 0
                ? `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`
                : username,
            firstName,
            lastName,
            password: hashedPassword,
            is_phone_verified: false,
            is_email_verified: false,
          },
        });
        break;
      } catch (error) {
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('username')
        ) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new ConflictException(
              'Unable to generate a unique username. Please try again.',
            );
          }
          continue;
        }
        throw error;
      }
    }

    const userData = {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      password: hashedPassword,
      is_phone_verified: 'false',
      is_email_verified: 'false',
      role: 'USER',
      avatarUrl: '',
      refreshToken: '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    await this.redisService.setUser(user.id, userData);

    await this.otpService.sendOtp(registerDto.phoneNumber);

    return {
      message:
        'Registration successful. Please verify your phone number with the OTP sent.',
    };
  }

  async verifyRegistration(
    verifyData: VerifyOtpDto,
  ): Promise<{ message: string }> {
    const { phoneNumber, otp } = verifyData;

    const isValidOtp = await this.otpService.verifyOtpSendUser(
      phoneNumber,
      otp,
    );
    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        is_phone_verified: true,
        updatedAt: new Date(),
      },
    });

    const userData = {
      id: updatedUser.id,
      email: updatedUser.email || '',
      phoneNumber: updatedUser.phoneNumber || '',
      username: updatedUser.username || '',
      firstName: updatedUser.firstName || '',
      lastName: updatedUser.lastName || '',
      password: updatedUser.password || '',
      is_phone_verified: 'true',
      is_email_verified: updatedUser.is_email_verified ? 'true' : 'false',
      role: updatedUser.role || 'USER',
      avatarUrl: updatedUser.avatarUrl || '',
      refreshToken: updatedUser.refreshToken || '',
      createdAt: updatedUser.createdAt
        ? new Date(updatedUser.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setUser(updatedUser.id, userData);

    return { message: 'Registration verified successfully' };
  }

  async login(loginDto: LoginDto): Promise<{ message: string }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { phoneNumber: loginDto.phoneNumber },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!dbUser.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.comparePasswords(
      loginDto.password,
      dbUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!dbUser.is_phone_verified) {
      await this.otpService.sendOtp(loginDto.phoneNumber);
      throw new UnauthorizedException(
        'Please verify your phone number first. A new OTP has been sent.',
      );
    }

    await this.cacheUser(dbUser);

    await this.otpService.sendOtp(loginDto.phoneNumber);

    return { message: 'OTP sent for login verification' };
  }

  async verifyLogin(verifyData: VerifyLoginDto): Promise<AuthResponseDto> {
    const { phoneNumber, otp } = verifyData;

    const isOtpValid = await this.otpService.verifyOtpSendUser(
      phoneNumber,
      otp,
    );
    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    const userData = {
      id: user.id,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: user.password || '',
      is_phone_verified: user.is_phone_verified ? 'true' : 'false',
      is_email_verified: user.is_email_verified ? 'true' : 'false',
      role: user.role || 'USER',
      avatarUrl: user.avatarUrl || '',
      refreshToken: tokens.refreshToken,
      createdAt: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setUser(user.id, userData);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        updatedAt: new Date(),
      } as any,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
  async sendOtp(sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    const { phoneNumber, purpose } = sendOtpDto;

    if (purpose === OtpPurpose.SIGNUP) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (existingUser) {
        throw new ConflictException('Phone number already registered');
      }
    } else if (
      purpose === OtpPurpose.LOGIN ||
      purpose === OtpPurpose.PASSWORD_RESET
    ) {
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }
    }

    try {
      await this.otpService.sendOtp(phoneNumber);
      return { message: 'OTP sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phoneNumber}`, error);
      throw new BadRequestException('Failed to send OTP');
    }
  }
}
