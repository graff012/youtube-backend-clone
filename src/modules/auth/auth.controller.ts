import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  HttpException,
  ValidationError,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  VerifyLoginDto,
  SendOtpDto,
  AuthResponseDto,
} from './dto/create-auth.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const result = errors.map((error) => {
        const constraints = error.constraints || {};
        const constraintMessages = Object.values(constraints);
        return {
          property: error.property,
          message:
            constraintMessages.length > 0
              ? constraintMessages[0]
              : 'Validation error',
        };
      });

      return new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: result,
        },
        HttpStatus.BAD_REQUEST,
      );
    },
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: () => ({ message: String }),
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              property: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email or phone number already in use',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email already in use' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string }> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-registration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user registration with OTP' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Registration verified successfully',
    type: () => ({ message: String }),
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP or user not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired OTP',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid or expired OTP' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiBody({ type: VerifyOtpDto })
  async verifyRegistration(
    @Body() verifyData: VerifyOtpDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyRegistration(verifyData);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate user login' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP sent for login verification',
    type: () => ({ message: String }),
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or unverified account',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto): Promise<{ message: string }> {
    return this.authService.login(loginDto);
  }

  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify login with OTP' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid OTP or user not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid or expired OTP' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiBody({ type: VerifyLoginDto })
  async verifyLogin(
    @Body() verifyData: VerifyLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyLogin(verifyData);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for various purposes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP sent successfully',
    type: () => ({ message: String }),
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or user not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Phone number already registered',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Phone number already registered' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body() sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.sendOtp(sendOtpDto);
  }
}
