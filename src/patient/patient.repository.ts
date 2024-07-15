import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { PatientNoteDto } from "./Dto/patientNote.dto";
import { UpdatePatientDto } from "./Dto/updatePatient.dto";

@Injectable()
export class PatientRepository {
    constructor(
        private prisma: PrismaService
    ) { }

    private readonly logger = new Logger(PatientRepository.name);

    /**
     * 환자 데이터 리스트 가져오기
     * @returns  Promise<{
            id: number;
            addr: string;
            name: string;
            phoneNum: string;
            socialNum: string;
            patientBodyType: {
                tallWeight: string;
                digestion: string;
                sleep: string;
                constipation: string;
                nowDrug: string;
                pastDrug: string;
                pastSurgery: string;
            };
        }[]>
     */
    async getPatientList() {
        try {
            const res = await this.prisma.patient.findMany({
                select: {
                    id: true,
                    name: true,
                    phoneNum: true,
                    addr: true,
                    socialNum: true,
                    patientBodyType: {
                        select: {
                            tallWeight: true,
                            digestion: true,
                            sleep: true,
                            constipation: true,
                            nowDrug: true,
                            pastDrug: true,
                            pastSurgery: true,
                        }
                    },
                    patientNotes: {
                        where: { useFlag: true },
                        select: {
                            id: true,
                            note: true
                        }
                    },
                    orders: {
                        select: {
                            id: true,
                            orderItems: {
                                select: {
                                    id: true,
                                    item: true,
                                    type: true,
                                    orderId: true
                                }
                            },
                            tempOrders: {
                                select: {
                                    sendList: {
                                        select: {
                                            title: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return res;
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 특이사항 생성
     * @param patientNoteDto 
     * @returns {success:boolean}
     */
    async patientCreateNote(patientNoteDto: PatientNoteDto) {
        try {
            await this.prisma.patientNote.create({
                data: {
                    patientId: patientNoteDto.patientId,
                    note: patientNoteDto.note
                }
            });

            return { success: true };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 특이사항 수정
     * @param patientNoteDto 
     * @returns {success:boolean}
     */
    async patientUpdateNote(patientNoteDto: PatientNoteDto) {
        try {
            await this.prisma.patientNote.update({
                where: { id: patientNoteDto.id },
                data: { note: patientNoteDto.note }
            });

            return { success: true };


        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 환자 검색
     * @param patientConditions 
     * @returns 
     */
    async search(patientConditions) {
        try {

            const res = await this.prisma.patient.findMany({
                where: { ...patientConditions },
                select: {
                    id: true,
                    name: true,
                    phoneNum: true,
                    addr: true,
                    socialNum: true,
                    patientBodyType: {
                        select: {
                            tallWeight: true,
                            digestion: true,
                            sleep: true,
                            constipation: true,
                            nowDrug: true,
                            pastDrug: true,
                            pastSurgery: true,
                        }
                    },
                    patientNotes: {
                        where: { useFlag: true },
                        select: {
                            id: true,
                            note: true
                        }
                    },
                    orders: {
                        select: {
                            id: true,
                            orderItems: {
                                select: {
                                    id: true,
                                    item: true,
                                    type: true,
                                    orderId: true
                                }
                            },
                            tempOrders: {
                                select: {
                                    sendList: {
                                        select: {
                                            title: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return res;

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );

        }
    }

    /**
     * 환자 정보 업데이트
     * @param updatePatientDto 
     * @returns {success:boolean}
     */
    async updatePatient(updatePatientDto: UpdatePatientDto) {
        try{
            await this.prisma.$transaction(async (tx) => {
                delete updatePatientDto.patient.socialNum;

                await tx.patient.update({
                    where:{id:updatePatientDto.patientId},
                    data:updatePatientDto.patient,
                });

                if(updatePatientDto.patientBodyType != null) {
                    await tx.patientBodyType.update({
                        where:{id:updatePatientDto.patientId},
                        data:updatePatientDto.patientBodyType,
                    });
                }
               
            });

            return {success: true}
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

}