import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PatchDeliveryVolumeDto } from './Dto/patchDeliveryVolume.dto';

@Injectable()
export class AdminRepository {
    constructor(private prisma: PrismaService) {}

    private readonly logger = new Logger(AdminRepository.name);

    /**
     * 전체 발송량 조회
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            data: {
                id: number;
                day_of_week: $Enums.dailyDeliveryVolume_day_of_week;
                volume: number;
                updated_at: Date;
                is_del: boolean;
            }[];
        }>
     */
    async getAllDeliveryVolume() {
        try {
            const res = await this.prisma.dailyDeliveryVolume.findMany({
                where: {
                    is_del: false,
                },
                orderBy: { id: 'asc' },
            });

            return { success: true, status: HttpStatus.OK, data: res };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 해당 요일 발송량 수정
     * @param patchDeliveryVolumeDto
     * @param updatedDate
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            data: {
                id: number;
                day_of_week: $Enums.dailyDeliveryVolume_day_of_week;
                volume: number;
                updated_at: Date;
                is_del: boolean;
            }[];
        }>
     */
    async patchChangedDeliveryVolume(
        patchDeliveryVolumeDto: PatchDeliveryVolumeDto,
        updatedDate: Date,
    ) {
        try {
            await this.prisma.dailyDeliveryVolume.update({
                where: {
                    id: patchDeliveryVolumeDto.id,
                },
                data: {
                    volume: patchDeliveryVolumeDto.volume,
                    updated_at: updatedDate,
                },
            });

            const res = await this.getAllDeliveryVolume();

            return { success: true, status: HttpStatus.OK, data: res.data };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
