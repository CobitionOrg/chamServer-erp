import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { deleteUploadObject } from "src/util/s3";
const fs = require('fs');
const path = require('path');

@Injectable()
export class TasksRepository {
    constructor(
        private prisma: PrismaService
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
}