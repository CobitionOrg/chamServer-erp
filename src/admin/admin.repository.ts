import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminRepository {
    constructor(private prisma: PrismaService) {}

    private readonly logger = new Logger(AdminRepository.name);

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

    async patchChangedDeliveryVolume(patchDeliveryVolumeDto, updatedDate) {
        try {
            await this.prisma.dailyDeliveryVolume.update({
                where: {
                    id: patchDeliveryVolumeDto.id
                },
                data: {
                    volume: patchDeliveryVolumeDto.volume,
                    updated_at: updatedDate,
                }
            })

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
