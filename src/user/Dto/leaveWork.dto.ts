import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsNumber } from "class-validator";

export class LeaveWorkDto {
    @ApiProperty()
    @IsNumber()
    readonly id : number;
    
    @ApiProperty()
    @IsDate()
    readonly date : Date;
}