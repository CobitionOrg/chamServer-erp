import { HttpStatus, Injectable ,Logger} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';

@Injectable()
export class UserService{
    constructor(
        private prisma : PrismaService
    ){}
    private readonly logger = new Logger(UserService.name);
    private readonly bcryptClass = new BcryptUtilClass();

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

    /**
     * 회원가입
     * @param signUpDto :SginUpDto
     * @returns {success:bool,status:HttpStatus};
     */
    async signUp(signUpDto:SignUpDto) : Promise<any>{
        try{
            console.log(signUpDto.userPw);
            const userPw = await this.bcryptClass.hashing(signUpDto.userPw);
            console.log(userPw);

            const checkId = await this.checkId(signUpDto.userId);
            if(!checkId.success) return {success:false,status:HttpStatus.CONFLICT};

            const res = await this.prisma.user.create({
                data:{
                    userId : signUpDto.userId,
                    userPw : userPw,
                    name : signUpDto.name,
                    grade : 'user',
                },
            });

            console.log(res);

            return {success:true,status:HttpStatus.CREATED};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            };      
        }
    }

    /**
     * 아이디 중복 체크
     * @param userId : string
     * @returns {success:bool,status:HttpStatus};
     */
    async checkId(userId:string) :Promise<any>{
        try{
            const res = await this.prisma.user.findFirst({
                where :{
                    userId : userId
                }
            });

            if(res) return {success:false};
            else return {success:true};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
}
