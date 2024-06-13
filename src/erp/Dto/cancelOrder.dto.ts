import { OrderItem, Patient } from "./cancelSendOrder.dto";

export interface CancelOrderDto {
    orderId: number;
    patientId: number;
    isFirst: boolean;
}