import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminService {
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService, 
    ){}

    private readonly logger = new Logger(AdminService.name);

    async insertQuestion(){
        try{
            
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }
}
