import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class LeaveWorkDto {
    @ApiProperty()
    @IsNumber()
    readonly id : number;
    
    @ApiProperty()
    @IsString()
    readonly date : string;
}