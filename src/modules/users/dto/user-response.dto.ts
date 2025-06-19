import { Exclude, Expose } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose({ name: 'firstName' })
  first_name: string;

  @Expose({ name: 'lastName' })
  last_name: string;

  @Expose()
  email: string;

  @Expose()
  role: Role;

  @Expose({ name: 'avatarUrl' })
  avatar_url: string | null;

  @Expose({ name: 'isEmailVerified' })
  is_email_verified: boolean;

  @Expose({ name: 'isPhoneVerified' })
  is_phone_verified: boolean;

  @Expose({ name: 'createdAt' })
  created_at: Date;

  @Expose({ name: 'updatedAt' })
  updated_at: Date;

  @Expose({ name: 'subscribersCount' })
  subscribers_count?: number;

  @Expose({ name: 'subscriptionsCount' })
  subscriptions_count?: number;

  @Exclude()
  password: string;

  @Exclude()
  refresh_token: string;

  @Exclude()
  phone_number: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
