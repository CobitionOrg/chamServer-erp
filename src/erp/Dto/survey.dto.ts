import { SurveyAnswerDto } from "./surveyAnswer.dto";

export interface SurveyDto {
    answers:Array<SurveyAnswerDto>;
    date:Date;
}