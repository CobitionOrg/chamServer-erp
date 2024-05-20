export class CashExcel {
    excelData : Array<any>;
    dbData : Array<any>;
    matches : Array<any>;
    duplicates : Array<any>;
    countMap1 : any;
    countMap2 : any;

    constructor(excelData: any, dbData: any){
        this.excelData = excelData;
        this.dbData = dbData;
        this.countMap1 = new Map();
        this.countMap2 = new Map();
        this.matches = [];
        this.duplicates = [];
    }

    countNames() {
        this.excelData.forEach((e) => {
            this.countMap1.set(e.name, (this.countMap1.get(e) || 0) +1);
        });

        console.log(this.dbData);
        this.dbData.forEach((e) =>{
            this.countMap2.set(e.patient.name, (this.countMap2.get(e) || 0) +1);
        });
    }

    findMatchesAndDuplicates(){
        this.countMap1.forEach((count1, e:any) => {
            const count2 = this.countMap2.get(e) || 0

            if(count1 === 1 && count2 ===1) {
                this.matches.push(e);
            }else if(count1 > 0 && count2 > 0){
                this.duplicates.push(e);
            }
        });
    }

    getResult(){
        this.countNames();
        this.findMatchesAndDuplicates();
        return {matches:this.matches,duplicates:this.duplicates};
    }
}