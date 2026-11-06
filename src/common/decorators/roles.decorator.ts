import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../constants/user-role';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);