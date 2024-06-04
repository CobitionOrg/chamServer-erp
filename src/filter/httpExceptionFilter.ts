import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host:ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        //const request = ctx.getRequest();
        console.log(typeof exception.getStatus());
        const status:number = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        console.log(status);
        const res:any = exception.getResponse();
        console.log(res.msg);

        response.status(status).json({
            success:false,
            msg:res.msg
        });

        //console.log(response);
    }
} 