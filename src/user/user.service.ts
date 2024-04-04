import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService{
    constructor(private prisma : PrismaService){}
    async findUserById(userId : string) {
        try{
            const res = await this.prisma.user.findFirst();
            console.log(res);
            return res;
        }catch(err){
            console.log(err);
            return {success:false};
        }
    }
}
