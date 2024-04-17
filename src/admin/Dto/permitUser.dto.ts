import { ApiOperation, ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, IsString } from "class-validator";

export class PermitUserDto {
    @ApiProperty()
    @IsString()
    readonly userId : string;

    @ApiProperty()
    @IsString()
    readonly name : string;

    @ApiProperty()
    @IsNumber()
    readonly id : number;

    @ApiProperty()
    @IsString()
    readonly grade : string;
}

export class PermitListDto {
    @ApiProperty()
    @IsArray()
    readonly users : Array<PermitListDto>
}