import { HttpStatus, Injectable ,Logger, UnauthorizedException} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';
import { LoginDto } from './Dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService{
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService,
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

    /**
     * 로그인
     * @param loginDto :LoginDto
     * @returns {success:bool,status:HttpStatus};
     */
    async signIn(loginDto:LoginDto){
        try{
            const userData = await this.prisma.user.findUnique({
                where:{
                    userId : loginDto.userId,
                },
            });

            if(userData?.userId==null || userData.userPw==null){
                return {success:false,status:404}
            }
            
            const check = await this.bcryptClass.checkLogin(loginDto.userPw,userData.userPw);

            if(!check) { //비밀번호 일치하지 않을 시
                throw new UnauthorizedException();
            }else{
                const payload = {
                    sub:userData.id,
                    name:userData.name,
                    userId:userData.userId
                };

                const access_token = await this.jwtService.signAsync(payload);
                return {
                    success:true,
                    status:HttpStatus.OK, 
                    token : access_token
                };
            }


        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            }
        }
    }
}
