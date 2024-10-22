import { IsInt, Max, Min } from 'class-validator';

export class PatchDeliveryVolumeDto {
  // 각 요일의 volume 값
  // mysql unsgined small int (0~65535)
  @IsInt()
  @Min(0)
  @Max(65535)
  monday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  tuesday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  wednesday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  thursday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  friday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  saturday: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  sunday: number;
}
