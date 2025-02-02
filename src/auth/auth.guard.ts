import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants, orderUpdConstants } from './constants';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { IS_ORDERUPD_KEY } from './decorators/order.decorator';
import { CustomUnauthorizedException } from './CustomUnauthorizedException';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
         private reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const isOrderUpd = this.reflector.getAllAndOverride<boolean>(IS_ORDERUPD_KEY,[
            context.getHandler(),
            context.getClass(),
        ]);

        if(isOrderUpd){
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromHeader(request);
            if (!token) {
                throw new UnauthorizedException({success:false,status:401});
            }

            try {
                const payload = await this.jwtService.verifyAsync(
                    token,
                    {
                        secret: process.env.orderUpdConstants
                    }
                );
                console.log(payload);
                // 💡 We're assigning the payload to the request object here
                // so that we can access it in our route handlers
                request['user'] = payload;
            } catch (err){
                console.log(err);
    
                throw new UnauthorizedException({success:false,status:401});
            }
            return true;
        }
        
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new CustomUnauthorizedException({success:false,status:401});
        }

        try {
            // 서버에서 secret: jwtConstants.secret으로 하면 undefined가 나옵니다
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: process.env.jwtConstant
                }
            );
            //console.log(payload);
            // 💡 We're assigning the payload to the request object here
            // so that we can access it in our route handlers
            request['user'] = payload;
        } catch (err){
            console.log(err);

            throw new CustomUnauthorizedException({success:false,status:401});
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}