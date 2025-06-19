import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export enum OtpPurpose {
  SIGNUP = 'signup',
  PASSWORD_RESET = 'password-reset',
  LOGIN = 'login',
  VERIFY_ACCOUNT = 'verify-account',
}

export class SendOtpDto {
  @IsPhoneNumber('UZ', { message: 'Please provide a valid phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @IsEnum(OtpPurpose, { message: 'Invalid OTP purpose' })
  @IsNotEmpty({ message: 'OTP purpose is required' })
  purpose: OtpPurpose;
}

export class VerifyOtpDto {
  @IsPhoneNumber('UZ', { message: 'Please provide a valid phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @IsString({ message: 'OTP must be a string' })
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @IsEnum(OtpPurpose, { message: 'Invalid OTP purpose' })
  @IsNotEmpty({ message: 'OTP purpose is required' })
  purpose: OtpPurpose;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @Matches(/^[A-Za-z\s-']+$/, { message: 'First name can only contain letters, spaces, hyphens, and apostrophes' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @Matches(/^[A-Za-z\s-']+$/, { message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' })
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsPhoneNumber('UZ', { message: 'Please provide a valid phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class LoginDto {
  @IsPhoneNumber('UZ', { message: 'Please provide a valid phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class VerifyLoginDto extends VerifyOtpDto {}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
  };
}
