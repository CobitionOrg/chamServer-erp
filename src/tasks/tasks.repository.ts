import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CancelOrderDto } from "src/erp/Dto/cancelOrder.dto";
import { ErpService } from "src/erp/erp.service";
import { PrismaService } from "src/prisma.service";
import { deleteUploadObject } from "src/util/s3";
const fs = require('fs');
const path = require('path');

@Injectable()
export class TasksRepository {
    constructor(
        private prisma: PrismaService,
    ) { }

    private readonly logger = new Logger(TasksRepository.name);

    async deleteS3Data() {
        try {
            const list = await this.prisma.urlData.findMany({});

            console.log(list);

            for (let i = 0; i < list.length; i++) {
                await deleteUploadObject(list[i].objectName);
            }

            await this.prisma.urlData.deleteMany({});

            this.logger.log('complete');
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

    async deleteSaveFile() {
        try {
            const folderPath = './src/files'
            // 폴더 안의 모든 파일 가져오기
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    console.error('폴더를 읽는 중 에러 발생:', err);
                    return;
                }

                // 각 파일을 순회하며 삭제
                files.forEach(file => {
                    const filePath = path.join(folderPath, file);

                    // 파일 삭제
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error(`파일을 삭제하는 중 에러 발생 (${file}):`, err);
                        } else {
                            console.log(`파일 삭제 완료: ${file}`);
                        }
                    });
                });
            });
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

    
    async deleteNotCallOrder() {
        try{
            const today = new Date();

            const twoMonthAgo = new Date(today.setMonth(today.getMonth() - 2));

            const oldRecords = await this.prisma.order.findMany({
                where:{
                    date:{
                        lt: twoMonthAgo
                    },
                },
                select:{
                    id: true,
                    patient:{select:{id:true}},
                    isFirst:true
                }
            });

            for(const e of oldRecords) {
                const cancelOrderDto: CancelOrderDto = {
                    orderId: e.id,
                    patientId: 0,
                    isFirst: false
                }

                if (cancelOrderDto.isFirst) {
                    //초진 일 시 환자 데이터까지 soft delete
                    const orderId = cancelOrderDto.orderId;
                    const patientId = cancelOrderDto.patientId;
    
                    await this.prisma.$transaction(async (tx) => {
                        //orderBodyType soft delete
                        await tx.orderBodyType.update({
                            where: { orderId: orderId },
                            data: { useFlag: false }
                        });
    
                        //orderItem soft delete
                        await tx.orderItem.updateMany({
                            where: { orderId: orderId },
                            data: { useFlag: false }
                        });
    
                        //order soft delete
                        await tx.order.update({
                            where: { id: orderId },
                            data: { useFlag: false }
                        });
    
                        //patient soft delete
                        await tx.patient.update({
                            where: { id: patientId },
                            data: { useFlag: false } 
                        });
                    });
    
                    return { success: true, status: HttpStatus.OK, msg: '초진 삭제' }
                } else {
                    //재진 일 시 환자 데이터는 가지고 있어야 되기 때문에 오더 정보만 삭제
                    const orderId = cancelOrderDto.orderId;
    
                    //오더만 useFlag false로 변경
                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: { useFlag: false }
                    });
    
                    return { success: true, status: HttpStatus.OK, msg: '재진 삭제' }
    
                }


            }
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