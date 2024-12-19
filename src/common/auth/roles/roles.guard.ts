import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, verify } from 'jsonwebtoken';
import { Observable } from 'rxjs';
import { HttpError } from 'src/common/exception/http.error';
import { Role } from './role.enum';
import { ROLES_KEY } from './roles.decorator';
import { env } from 'src/common/config';

export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    try {
      const required_roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      const request = context.switchToHttp().getRequest();
      let bearer_token = request.headers['authorization'];

      if (!bearer_token) {
        HttpError({ code: 'BEARER_TOKEN_NOT_PROVIDED' });
      }
      bearer_token = bearer_token.split(' ')[1];

      const valid_user: any = verify(bearer_token, env.ACCESS_TOKEN_SECRET);
      if (!valid_user) HttpError({ code: 'LOGIN_FAILED' });

      request.user = { ...valid_user };
      return required_roles?.includes(valid_user.role);
    } catch (error) {
      if (error.message == 'jwt expired') HttpError({ code: 'JWT_EXPIRED' });
      if (error instanceof JsonWebTokenError) HttpError({ code: 'JWT_INVALID' });
      throw error;
    }
  }
}
