import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    /**
     * 
     * @param exception 현재 처리 중인 예외 객체
     * @param host host ArgumentsHost 객체 -> 핸들러에 전달되는 인수를 검색하는 메서드를 제공한다 (Express를 사용하는 경우 - Response & Request & Next 제공)
     */
    catch(exception: HttpException, host:ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        //const request = ctx.getRequest();

        const status:number = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const res:any = exception.getResponse();

        response.status(status).json({
            success:false,
            msg:res.msg
        });

        //console.log(response);
    }
} 