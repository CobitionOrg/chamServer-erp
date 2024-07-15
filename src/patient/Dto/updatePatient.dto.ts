export interface UpdatePatientDto {
    patientId: number;
    patient: Patient;
    patientBodyType: PatientBodyType
}

interface Patient {
    name: string;
    phoneNum: string;
    socialNum: string;
    addr: string;
}

interface PatientBodyType {
    tallWeight: string;
    digestion: string;
    sleep: string;
    constipation: string;
    nowDrug: string;
    pastDrug: string;
    pastSurgery: string;
}