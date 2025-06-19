import { Request } from 'express';

export interface UserPayload {
  id: string;
  username: string;
  email: string;
  roles: string[];
  is_email_verified: boolean;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
