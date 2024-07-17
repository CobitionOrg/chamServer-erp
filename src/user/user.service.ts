import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';
import { LoginDto } from './Dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AttendanceDto } from './Dto/attendance.dto';
import { LeaveWorkDto } from './Dto/leaveWork.dto';
import { getMonth } from 'src/util/getMonth';
import { getCurrentDateAndTime, getStartOfToday, checkTardy } from 'src/util/kstDate.util';
import { ChangePwDto } from './Dto/changePw.dto';

@Injectable()
export class UserService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    private readonly logger = new Logger(UserService.name);
    private readonly bcryptClass = new BcryptUtilClass();

    async findUserById(userId: string) {
        try {
            const res = await this.prisma.user.findFirst();
            console.log(res);
            return res;
        } catch (err) {
            console.log(err);
            return { success: false };
        }
    }

    /**
     * 회원가입
     * @param signUpDto :SignUpDto
     * @returns {success:bool,status:HttpStatus};
     */
    async signUp(signUpDto: SignUpDto): Promise<any> {
        try {
            console.log(signUpDto.userPw);
            const userPw = await this.bcryptClass.hashing(signUpDto.userPw);
            console.log(userPw);

            const checkId = await this.checkId(signUpDto.userId);
            if (!checkId.success) return { success: false, status: HttpStatus.CONFLICT };

            const res = await this.prisma.user.create({
                data: {
                    userId: signUpDto.userId,
                    userPw: userPw,
                    name: signUpDto.name,
                    grade: 'user',
                },
            });

            console.log(res);

            return { success: true, status: HttpStatus.CREATED };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 아이디 중복 체크
     * @param userId : string
     * @returns {success:bool,status:HttpStatus};
     */
    async checkId(userId: string): Promise<any> {
        try {
            const res = await this.prisma.user.findFirst({
                where: {
                    userId: userId
                }
            });

            if (res) return { success: false };
            else return { success: true };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 로그인
     * @param loginDto :LoginDto
     * @returns {success:bool,status:HttpStatus};
     */
    async signIn(loginDto: LoginDto) {
        try {
            const userData = await this.prisma.user.findUnique({
                where: {
                    userId: loginDto.userId,
                    useFlag: true
                },
            });

            if (userData?.userId == null || userData.userPw == null) {
                return { success: false, status: 404 }
            }

            const check = await this.bcryptClass.checkLogin(loginDto.userPw, userData.userPw);

            if (!check) { //비밀번호 일치하지 않을 시
                throw new UnauthorizedException();
            } else {
                const payload = {
                    sub: userData.id,
                    name: userData.name,
                    userId: userData.userId
                };

                const access_token = await this.jwtService.signAsync(payload);
                return {
                    success: true,
                    status: HttpStatus.OK,
                    token: access_token,
                    id: userData.id
                };
            }

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 출근
     * @param attendanceDto 
     * @returns {success:bool,status:HttpStatus};
     */
    async attendance(attendanceDto: AttendanceDto) {
        try {
            const loginDto: LoginDto = {
                userId: attendanceDto.userId,
                userPw: attendanceDto.userPw,
            };
            //let startTime1 = tardy(attendanceDto.todayDate);

            const login = await this.signIn(loginDto);

            if (!login.success) return login;

            //중복 출근 방지 
            const attendanceDate = getStartOfToday();
            const alreadyAttendance = await this.prisma.attendance.findFirst({
                where: {
                    userId: login.id,
                    date: attendanceDate
                }
            });
            //console.log(alreadyAttendance);
            if (alreadyAttendance) return { success: true, status: HttpStatus.CONFLICT }

            //console.log(attendanceDto.todayDate)
            let startTime = getCurrentDateAndTime();
            let isTardy = checkTardy(startTime);

            await this.prisma.attendance.create({
                data: {
                    date: attendanceDate,
                    startTime: startTime,
                    endTime: startTime,
                    userId: login.id,
                    tardy: isTardy
                }
            });

            return {
                success: true,
                status: HttpStatus.OK,
                token: login.token,
            };

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 퇴근하기
     * @param header 
     * @param leaveWork 
     * @returns 
     */
    async leaveWork(header, leaveWork: LeaveWorkDto) {
        try {
            const token = await this.jwtService.decode(header);
            console.log(token);
            await this.prisma.attendance.update({
                where: {
                    id: leaveWork.id,
                    userId: token.sub
                },
                data: {
                    endTime: getCurrentDateAndTime(),
                },
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 유저 데이터 가져오기
     * @param header :string 
     * @param month : number
     * @returns 
     */
    async getUserData(header, month: number) {
        try {
            const token = await this.jwtService.decode(header);
            console.log(token);


            const res = await this.getAttendance(token.sub, month);

            console.log(res);

            return { data: res, success: true };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 해당 유저 근태 조회
     * @param id 
     * @param month 
     * @returns 
     */
    async getAttendance(id: number, month: number) {
        try {

            const getTimeObj = getMonth(month);
            console.log(getTimeObj);
            const res = await this.prisma.user.findFirst({
                select: {
                    name: true,
                    userId: true,
                    grade: true,
                    attendances: {
                        select: {
                            id: true,
                            date: true,
                            startTime: true,
                            endTime: true,
                            tardy: true,
                        },
                        where: {
                            userId: id,
                            date: {
                                lte: new Date(getTimeObj.lte),
                                gte: new Date(getTimeObj.gte),
                            }
                        },
                        orderBy: {
                            date: 'desc'
                        }
                    }
                },
                where: {
                    id: id
                }
            });
            console.log(res);
            return res;
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 유저 권한 업데이트
     * @param header 
     * @param id 
     * @returns {success:boolean}
     */
    async userFlagUpd(header: string, id: number) {
        try {
            console.log(id);
            console.log(typeof id);

            const token = await this.jwtService.decode(header);
            const userId = token.sub;

            const checkGrade = await this.checkUserGrade(userId);
            if (!checkGrade.success) return { success: false, status: HttpStatus.FORBIDDEN };


            const userUpd = await this.prisma.user.update({
                where: {
                    id: id
                },
                data: {
                    useFlag: true
                }
            });

            console.log(userUpd);

            return { success: true, status: HttpStatus.OK };

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 유저 등급 확인
     * @param id 
     * @returns {success:boolean}
     */
    async checkUserGrade(id: number) {
        try {
            const userData = await this.prisma.user.findUnique({
                where: {
                    id: id
                },
                select: {
                    grade: true,
                },
            });

            if (userData.grade == 'admin' || userData.grade == 'boss') {
                return { success: true };
            } else {
                return { success: false };
            }

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 출근 여부 확인
     */
    async isWorking(header) {
        try {
            const token = await this.jwtService.decode(header);
            console.log(token);
            const userId = token.sub;

            const attendanceData = await this.prisma.attendance.findFirst({
                where: {
                    date: getStartOfToday(),
                    userId: userId,
                }
            });

            let isWorking = false;

            if(attendanceData !== null) {
                isWorking = true;
                if(attendanceData.startTime.getTime() !== attendanceData.endTime.getTime()) {
                    isWorking = false;
                }
            }
            
            console.log(isWorking);

            return { success: true, isWorking: isWorking };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 이미 로그인 했을 경우
     * 토큰만 사용해서 출근
     */
    async justAttendance(header) {
        try {
            const token = await this.jwtService.decode(header);
            const userId = token.sub;

            // 중복 출근 방지
            const attendanceData = getStartOfToday();
            const alreadyAttendance =  await this.prisma.attendance.findFirst({
                where: {
                    userId: userId,
                    date: attendanceData
                }
            });

            if(alreadyAttendance) return { success: true, status: HttpStatus.CONFLICT }

            const startTime = getCurrentDateAndTime();
            const isTardy = checkTardy(startTime);

            await this.prisma.attendance.create({
                data: {
                    date: attendanceData,
                    startTime: startTime,
                    endTime: startTime,
                    userId: userId,
                    tardy: isTardy,
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async requestReview() {
        try {
            const today = getStartOfToday();
    
            // 이번 주 월요일부터 금요일까지의 날짜를 계산
            const monday = new Date(today);
            const tuesday = new Date(today);
            const thursday = new Date(today);
            const friday = new Date(today);
        
            monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
            tuesday.setDate(monday.getDate() + 1);
            thursday.setDate(monday.getDate() + 3);
            friday.setDate(monday.getDate() + 4);

            console.log(monday);
            console.log(tuesday);
            console.log(thursday);
            console.log(friday);
        
            // 데이터 조회
            const data = await this.prisma.order.findMany({
              where: {
                date: {
                  in: [monday, tuesday, thursday, friday],
                }
              }
            });

            console.log(data);
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 비밀번호 변경
     * @param changePwDto 
     * @param header 
     * @returns {success:boolean, status: HttpStatus}
     */
    async changePw(changePwDto: ChangePwDto, header: string) {
        try{
            const token = await this.jwtService.decode(header);
            const userData = await this.prisma.user.findUnique({
                where: {
                    id: token.sub,
                    useFlag: true
                },
            });

            if (userData?.userId == null || userData.userPw == null) {
                return { success: false, status: 404 }
            }

            const check = await this.bcryptClass.checkLogin(changePwDto.userPw, userData.userPw);

            if (!check) { //비밀번호 일치하지 않을 시
                throw new UnauthorizedException();
            } else {
                const newPassWord = await this.bcryptClass.hashing(changePwDto.newPw);
                await this.prisma.user.update({
                    where:{id:userData.id},
                    data:{userPw:newPassWord}
                });
            }

            return { success:true, status:HttpStatus.CREATED }

        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
