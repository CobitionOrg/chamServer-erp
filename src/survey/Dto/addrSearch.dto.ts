import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddrSearchDto {
  @ApiProperty()
  @IsString()
  readonly keyword: string;

  @ApiProperty()
  @IsString()
  readonly page: string;
}
