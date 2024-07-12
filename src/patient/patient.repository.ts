import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { PatientNoteDto } from "./Dto/patientNote.dto";

@Injectable()
export class PatientRepository {
    constructor(
        private prisma: PrismaService
    ){}

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
        try{
            const res = await this.prisma.patient.findMany({
                select:{
                    id: true,
                    name: true,
                    phoneNum: true,
                    addr: true,
                    socialNum: true,
                    patientBodyType:{
                        select:{
                            tallWeight: true,
                            digestion: true,
                            sleep: true,
                            constipation: true,
                            nowDrug: true,
                            pastDrug: true,
                            pastSurgery: true,
                        }
                    },
                    orders:{
                        select: {
                            id: true,
                            orderItems: true,
                            tempOrders:{
                                select:{
                                    sendList:{
                                        select:{
                                            title:true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return res;
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async patientCreateNote(patientNoteDto: PatientNoteDto) {
        try{
            await this.prisma.patientNote.create({
                data:{
                    patientId:patientNoteDto.patientId,
                    note: patientNoteDto.note
                }
            });

            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async patientUpdateNote(patientNoteDto: PatientNoteDto) {
        try{
            await this.prisma.patientNote.update({
                where:{id:patientNoteDto.id},
                data:{note:patientNoteDto.note}
            });

            return {success:true};


        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

}