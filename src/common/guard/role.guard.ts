import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface UserPayload {
  roles?: string[];
  [key: string]: any;
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required roles from the handler or class metadata
    const handler = context.getHandler();
    const roles = this.reflector.get<string[]>('roles', handler) || [];
    
    // If no roles are required, allow access
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request.user;

    // If no user is found, deny access
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has any of the required roles
    const userRoles = user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required one of these roles: ${roles.join(', ')}`
      );
    }

    return true;
  }
}
