import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { InsertQuestionDto } from './Dto/question.dto';
import { Choice, Visit } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { PermitListDto } from './Dto/permitUser.dto';
import { getCurrentDateAndTime, getCurrentMonth } from 'src/util/kstDate.util';
import { AdminRepository } from './admin.repository';
import { PatchDeliveryVolumeDto } from './Dto/patchDeliveryVolume.dto';

@Injectable()
export class AdminService {
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService, 
        private userService : UserService,
        private readonly adminRepository: AdminRepository
    ){}

    private readonly logger = new Logger(AdminService.name);
    
    /**
     * admin 유저 확인
     * @param header 
     * @returns {success:boolean,status:HttpStatus}
     */    
    async checkAdmin(header:string){
        try{
            const token = await this.jwtService.decode(header);
            const userId = token.sub;

            const checkGrade = await this.userService.checkUserGrade(userId);

            if(checkGrade.success) return {success:true};
            else return {success:false}
        }catch(err){
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
     * 질문 삽입하기
     * @param insertQuestionDto 
     * @param header 
     * @returns {success:boolean,status:HttpStatus}
     */
    async insertQuestion(insertQuestionDto:InsertQuestionDto,header:string){
        try{
            const checkAdmin = await this.checkAdmin(header);

            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            await this.prisma.$transaction(async (tx) => {
                const insertQuestion = await tx.question.create({
                    data:{
                        question:insertQuestionDto.question,
                        type:Visit[insertQuestionDto.type],
                        choice:Choice[insertQuestionDto.choice],
                        note:insertQuestionDto.note,
                    }
                });

                if(insertQuestionDto.imgUrl){
                    await tx.questionImg.create({
                        data:{
                            imgUrl:insertQuestionDto.imgUrl,
                            questionId:insertQuestion.id,
                            useFlag:true,
                        },
                    });
                }

                if(insertQuestionDto.answers){
                    const answerObj:any = insertQuestionDto.answers.map((e) => ({
                        answer:e.answer,
                        questionId : insertQuestion.id,
                    }));

                    await tx.answer.createMany({
                        data:answerObj
                    })
                }
            });

            return {success:true,status:HttpStatus.CREATED};
        }catch(err){
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
     * 유저 허용
     * @param header 
     * @param userId 
     * @returns {success:boolean,status:number}
     */
    async permitUser(header:string, body:PermitListDto){
        try{
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            for(let i = 0; i<body.users.length; i++) {
                await this.prisma.user.update({
                    where:{id:body.users[i]['id']},
                    data:{useFlag:true},
                });
            };           

            return {success:true,status:HttpStatus.OK};
        }catch(err){
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
     * 유저 허용
     * @param header 
     * @returns 
     */
    async permitList(header:string){
        try{    
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            const res = await this.prisma.user.findMany({
                where:{
                    useFlag:false,
                    is_del:false,
                },
                select:{
                    userId:true,grade:true,name:true,id:true
                }
            });

            return {success:true, res};
            
        }catch(err){
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
     * 유저 리스트 조회
     * @param header 
     * @returns 
     */
    async getUserList(header:string){
        try{
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            const data = await this.prisma.user.findMany({
                where:{
                    useFlag:true,
                    is_del: false
                },
                select:{
                    id:true,
                    userId:true,
                    name:true,
                }
            });

            return {success:true, data};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async getAttendance(header:string,userId:number){
        try{
            console.log('----------'+userId);
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            const month = getCurrentMonth();
            const data = await this.userService.getAttendance(userId,month);
            //console.log(data);
            return {success:true,data};
        }catch(err){
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
     * 유저 계정 삭제
     * @param id 
     * @param header 
     * @returns {success:boolean, status:HttpStatus}
     */
        async deleteUser(id: number, header: string) {
            try{
                const token = await this.jwtService.decode(header);
                const userId = token.sub;
    
                const checkGrade = await this.userService.checkUserGrade(userId);
                if (!checkGrade.success) return { success: false, status: HttpStatus.FORBIDDEN };
    
                await this.prisma.user.update({
                    where:{
                        id: id
                    },
                    data: {
                        is_del: true
                    }
                });
    
                return { success: true, status: HttpStatus.CREATED }
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

        /**
         * 요일별 발송량 전체 조회
         * @param header
         */
        async getAllDeliveryVolume(header: string) {
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            return await this.adminRepository.getAllDeliveryVolume();
        }

        /**
         * 요일별 발송량 수정
         * @param header
         * @param patchDeliveryVolumeDto
         */
        async patchChangedDeliveryVolume(header: string, patchDeliveryVolumeDto: PatchDeliveryVolumeDto) {
            const checkAdmin = await this.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            const updatedDate = getCurrentDateAndTime();
            return await this.adminRepository.patchChangedDeliveryVolume(patchDeliveryVolumeDto, updatedDate);
        }

        /**
         * 요일별 발송량 전체 조회
         * epr.service에서 발송량 확인용
         */
        async getAllDeliveryVolumeForERP() {
            return await this.adminRepository.getAllDeliveryVolume();
        }
}
