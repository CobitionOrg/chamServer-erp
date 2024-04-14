import { HttpStatus, Injectable ,Logger, UnauthorizedException} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';
import { LoginDto } from './Dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AttendanceDto } from './Dto/attendance.dto';
import { dateUtil } from 'src/util/date.util';
import { LeaveWorkDto } from './Dto/leaveWork.dto';

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
     * @param signUpDto :SignUpDto
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
                    useFlag : true
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
                    token : access_token,
                    id : userData.id
                };
            }

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }

    /**
     * 출근
     * @param attendanceDto 
     * @returns {success:bool,status:HttpStatus};
     */
    async attendance(attendanceDto : AttendanceDto){
        try{
            const loginDto : LoginDto = {
                userId: attendanceDto.userId,
                userPw: attendanceDto.userPw,
            };

            const login = await this.signIn(loginDto);

            if(!login.success) return login;

            console.log(attendanceDto.todayDate)
            let today = new Date(attendanceDto.todayDate);
            let startTime = dateUtil(attendanceDto.todayDate);
           
            
            await this.prisma.attendance.create({
                data : {
                    date : attendanceDto.todayDate,
                    startTime : startTime,
                    endTime : startTime,
                    userId : login.id,
                }
            });

            return {
                success:true,
                status:HttpStatus.OK,
                token : login.token,
            };

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }

    /**
     * 퇴근하기
     * @param header 
     * @param leaveWork 
     * @returns 
     */
    async leaveWork(header,leaveWork:LeaveWorkDto){
        try{
            const token = await this.jwtService.decode(header);
            console.log(token);
            await this.prisma.attendance.update({
                where:{
                    id : leaveWork.id,
                    userId:token.sub
                },
                data:{
                    endTime : leaveWork.date
                },
            });
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            }
        }
    }

    /**
     * 유저 데이터 가져오기
     * @param header :string 
     * @param month : number
     * @returns 
     */
    async getUserData(header,month:number){
        try{    
            const token = await this.jwtService.decode(header);
            console.log(token);

            const res = await this.prisma.user.findFirst({
                select:{
                    name:true,
                    userId:true,
                    grade:true,
                    attendances:{
                        select:{
                            id:true,
                            date:true,
                            startTime:true,
                            endTime:true,
                        },
                        where:{
                            userId:token.sub
                        },
                        orderBy : {
                            date:'desc'
                        }
                    }
                },
                where:{
                    id:token.sub
                }
            });

            console.log(res);

            return {data:res,success:true};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }

    /**
     * 유저 권한 업데이트
     * @param header 
     * @param id 
     * @returns {success:boolean}
     */
    async userFlagUpd(header:string,id:number){
        try{
            console.log(id);
            console.log(typeof id);
            
            const token = await this.jwtService.decode(header);
            const userId = token.sub;

            const checkGrade = await this.checkUserGrade(userId);
            if(!checkGrade.success) return {success:false,status:HttpStatus.FORBIDDEN};

           
            const userUpd = await this.prisma.user.update({
                where:{
                    id:id
                },
                data:{
                    useFlag:true
                }
            });

            console.log(userUpd);

            return {success:true, status:HttpStatus.OK};

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
            }
        }
    }

    /**
     * 유저 등급 확인
     * @param id 
     * @returns {success:boolean}
     */
    async checkUserGrade(id:number){
        try{
            const userData = await this.prisma.user.findUnique({
                where:{
                    id:id
                },
                select:{
                    grade:true,
                },
            });

            if(userData.grade=='admin' || userData.grade=='boss'){
                return {success:true};
            }else{
                return {success:false};
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
