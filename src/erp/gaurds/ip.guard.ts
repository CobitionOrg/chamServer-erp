import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpGuard implements CanActivate {
  // 일단 localhost만 가능
  private allowedIPs = [''];

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const clientIP = request.ip;

    console.log(clientIP);

    if (!this.isIPAllowed(clientIP)) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }

  private isIPAllowed(ip: string): boolean {
    return this.allowedIPs.includes(ip);
  }
}
