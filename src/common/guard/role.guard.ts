import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface UserPayload {
  roles?: string[];
  [key: string]: any;
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const roles = this.reflector.get<string[]>('roles', handler) || [];

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const userRoles = user.roles || [];
    const hasRequiredRole = roles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required one of these roles: ${roles.join(', ')}`
      );
    }

    return true;
  }
}
