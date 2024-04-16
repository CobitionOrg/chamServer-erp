import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginDto{
    @ApiProperty()
    @IsString()
    readonly userId: string;
    
    @ApiProperty()
    @IsString()
    readonly userPw: string;
}