import Redis, { Redis as RedisClient } from 'ioredis';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  public readonly client: RedisClient;
  private readonly duration = 180;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('connect', () => console.log('Redis connected'));
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
      this.client.quit();
      process.exit(1);
    });
  }

  async setOtp(phoneNumber: string, value: string): Promise<string> {
    const key = phoneNumber.startsWith('users:')
      ? phoneNumber
      : `users:${phoneNumber}`;
    const res = await this.client.setex(key, this.duration, value);
    return res;
  }

  async getOtp(phoneNumber: string): Promise<string | null> {
    const key = phoneNumber.startsWith('users:')
      ? phoneNumber
      : `users:${phoneNumber}`;
    return await this.client.get(key);
  }

  async getTtlKey(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async delKey(key: string): Promise<void> {
    await this.client.del(key);
  }

  async setUser(
    userId: string,
    userData: Record<string, string>,
  ): Promise<number> {
    return this.client.hset(`user:${userId}`, userData);
  }

  async getUser(userId: string): Promise<Record<string, string>> {
    return this.client.hgetall(`user:${userId}`);
  }

  async setIndex(
    field: string,
    value: string,
    userId: string,
  ): Promise<number> {
    return this.client.hset(`index:${field}`, value, userId);
  }

  async getUserIdByField(field: string, value: string): Promise<string | null> {
    return this.client.hget(`index:${field}`, value);
  }

  async getUserByEmail(email: string): Promise<Record<string, string> | null> {
    const userId = await this.getUserIdByField('email', email);
    if (!userId) return null;
    return this.getUser(userId);
  }

  async getUserByPhone(
    phoneNumber: string,
  ): Promise<Record<string, string> | null> {
    const userId = await this.getUserIdByField('phone', phoneNumber);
    if (!userId) return null;
    return this.getUser(userId);
  }

  async createUser(userData: {
    id: string;
    email: string;
    phoneNumber: string;
    fullName: string;
    password: string;
  }): Promise<void> {
    const userKey = `user:${userData.id}`;
    await Promise.all([
      this.setUser(userData.id, {
        ...userData,
        isVerified: 'false',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      this.setIndex('email', userData.email, userData.id),
      this.setIndex('phone', userData.phoneNumber, userData.id),
    ]);
  }

  async verifyUser(userId: string): Promise<void> {
    await this.client.hset(`user:${userId}`, 'isVerified', 'true');
  }
}
