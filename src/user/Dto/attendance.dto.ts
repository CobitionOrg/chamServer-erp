import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AttendanceDto {
    @ApiProperty()
    @IsString()
    readonly userId:string;

    @ApiProperty()
    @IsString()
    readonly userPw:string;

    @ApiProperty()
    @IsString()
    readonly todayDate : string;
}