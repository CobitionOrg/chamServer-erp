import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class InsertAnswerDto {
    @ApiProperty()
    @IsString()
    readonly answer :string;
}