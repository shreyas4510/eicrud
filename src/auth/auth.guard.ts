import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUtils } from './auth.utils';
import { CrudService } from '../crud/crud.service';
import { CrudDto, CrudEntity } from '../crud/model/crudEntity';
import { CrudContext } from './context.decorator';
import { CrudSecurity } from './model/CrudSecurity';


@Injectable()
export class AuthGuard implements CanActivate {
  
  
  constructor(protected jwtService: JwtService, protected reflector: Reflector,
    protected usersService: CrudService<any>,
    protected JWT_SECRET: string,
    protected securityMap: Record<string, CrudSecurity> = {},
    protected GUEST_ROLE: string = 'guest',
    ) {}


  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = AuthUtils.isPublicKey(context, this.reflector)
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    let user: any = { role: this.GUEST_ROLE }
    if (token && !isPublic) {
      try {
        const payload = await this.jwtService.verifyAsync(
          token,
          {
            secret: this.JWT_SECRET,
          }
        );
        // 💡 We're assigning the payload to the request object here
        // so that we can access it in our route handlers
        if(request.method == 'POST'){
          user = await this.usersService.findOne(payload);
        }else{
          user = await this.usersService.findOneCached(payload);
        }

        if(user?.revokedCount != payload.revokedCount){
          throw new UnauthorizedException("Token revokedCount mismatch");
        }

      } catch(e) {
        throw new UnauthorizedException(e);
      }
    }
    const serviceName = this.parseServiceName(request.path);
    const method = request.method;
    const query: CrudEntity = request.query?.query || request.body?.query || request.body?.data;
    const data = request.body?.data;
    const security: CrudSecurity = this.securityMap[serviceName];
    const crudContext: CrudContext = { serviceName, user, security, method, query, data };
    request['crudContext'] = crudContext
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private parseServiceName(path: string) {
    const pathParts = path.split('/');
    return pathParts[pathParts.length - 1];
  }
}