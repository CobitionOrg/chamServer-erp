import {
    Inject,
    Injectable,
    Logger,
    LoggerService,
    NestMiddleware
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(
        @Inject(Logger) private readonly logger : LoggerService
    ){}

    use(req:Request, res:Response, next:NextFunction){
         // 요청 객체로부터 ip, http method, url, user agent를 받아온 후
        const {ip,method,originalUrl} = req;
        const userAgent = req.get('user-agent');
        const start = Date.now();
        res.on('finish',() => {
            const { statusCode } = res;
            const end = Date.now();
            const time = end - start;
            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${time}ms ${ip} ${userAgent}`, 
            )
        });

        next();
    }
}