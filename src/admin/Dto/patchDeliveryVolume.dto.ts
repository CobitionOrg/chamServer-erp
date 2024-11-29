import { IsInt, Max, Min } from 'class-validator';

export class PatchDeliveryVolumeDto {
    // 1(월) - 7(일)
    @IsInt()
    @Min(1)
    @Max(7)
    id: number;

    // mysql unsigned small int (0~65535)
    @IsInt()
    @Min(0)
    @Max(65535)
    volume: number;
}
