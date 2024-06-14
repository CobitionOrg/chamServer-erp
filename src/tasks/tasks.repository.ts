import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { deleteUploadObject } from "src/util/s3";

@Injectable()
export class TasksRepository {
    constructor(
        private prisma: PrismaService
    ){}

    private readonly logger = new Logger(TasksRepository.name);

    async deleteS3Data(){
        try{
            const list = await this.prisma.urlData.findMany({});

            console.log(list);

            for(let i = 0; i<list.length; i++){
                await deleteUploadObject(list[i].objectName);
            }

            await this.prisma.urlData.deleteMany({});

            this.logger.log('complete');
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            ); 
        }
    }
}