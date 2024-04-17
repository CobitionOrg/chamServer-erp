import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { InsertAnswerDto } from "./answer.dto";

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

export class InsertQuestionDto {
    @ApiProperty()
    @IsString()
    readonly question:string;

    @ApiProperty()
    @IsEnum(Object.values(questionEnum))
    readonly type:questionType;

    @ApiProperty()
    @IsEnum(Object.values(choiceEnum))
    readonly choice:choiceType;

    @ApiProperty()
    @IsOptional()
    @IsString()
    readonly note: string;

    @ApiProperty()
    @IsOptional()
    readonly imgUrl : string;

    @ApiProperty()
    @IsOptional()
    @IsArray()
    readonly answers : Array<InsertAnswerDto>

}

