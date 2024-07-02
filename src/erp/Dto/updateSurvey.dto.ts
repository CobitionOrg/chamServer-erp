import { SurveyAnswerDto } from "./surveyAnswer.dto";

export interface UpdateSurveyDto {
    answers:Array<SurveyAnswerDto>;
    patientId : number;
    orderId : number;
    separateOrder?: Separate
}

export interface Separate {
    id: number | undefined;
    addr: string | undefined;
    sendTax: boolean | undefined; //택배비
    orderItem: string | undefined;
}