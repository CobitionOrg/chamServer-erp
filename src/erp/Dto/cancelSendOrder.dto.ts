export interface CancelSendOrderDto {
    orderId: number;
    tempOrderId: number;
    patientId: number;
    isFirst: boolean;
}

