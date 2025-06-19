import { UserRole } from '../../../common/types/user-role.enum';

export class User {
  id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
  refreshToken?: string;
}
