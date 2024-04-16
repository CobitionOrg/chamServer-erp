import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";

export class InsertQuestionDto {
    @ApiProperty()
    @IsString()
    readonly question:string;

    @ApiProperty()
    @IsString()
    readonly type:questionType;

    @ApiProperty()
    @IsString()
    readonly choice:choiceType;

    @ApiProperty()
    @IsString()
    readonly note: string;

}

//https://velog.io/@jay/typescript-enum-be-careful
//https://engineering.linecorp.com/ko/blog/typescript-enum-tree-shaking
const questionEnum = {
    f:'first',
    r:'return'
} 

export type questionType = typeof questionEnum[keyof typeof questionEnum];

const choiceEnum = {
    m:'multiple',
    s:'subjective'
} 

export type choiceType = typeof choiceEnum[keyof typeof choiceEnum];