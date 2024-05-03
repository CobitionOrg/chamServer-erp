import { SurveyAnswerDto } from "./surveyAnswer.dto";

export interface UpdateSurveyDto {
    answers:Array<SurveyAnswerDto>;
    patientId : number;
    orderId : number;
}