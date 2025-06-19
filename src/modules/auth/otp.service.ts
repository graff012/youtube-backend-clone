import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from '../../core/database/redis.service';
import { generate } from 'otp-generator';

@Injectable()
export class OtpService {
  constructor(private readonly redisService: RedisService) {}

  private generateOtp() {
    const otp = generate(6, {
      digits: true,
      specialChars: false,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
    });
    return otp;
  }

  async sendOtp(phoneNumber: string) {
    await this.checkOtpExisting(`users:${phoneNumber}`);
    const otp = this.generateOtp();

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);
    }

    const resRedis = await this.redisService.setOtp(phoneNumber, otp);
    if (resRedis === 'OK') {
      return true;
    }
    return false;
  }

  async checkOtpExisting(key: string) {
    const otp = await this.redisService.getOtp(key);
    if (otp) {
      const ttl = await this.redisService.getTtlKey(key);
      throw new BadRequestException(`Try again ${ttl} seconds`);
    }
  }

  async verifyOtpSendUser(phoneNumber: string, code: string) {
    const key = `users:${phoneNumber}`;
    const otp = await this.redisService.getOtp(key);
    if (otp !== code || !otp) {
      throw new BadRequestException('Invalid otp');
    }
    await this.redisService.delKey(key);
    return true;
  }
}
