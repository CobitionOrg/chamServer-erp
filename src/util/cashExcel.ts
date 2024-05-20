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
            console.log(e.name);
            let name = e.name;
            if(e.name.match(/[\uAC00-\uD7AF]/g)){
                name = e.name.match(/[\uAC00-\uD7AF]/g).join(''); //이름만 추출

            }
            this.countMap1.set(name, e);
        });

        //console.log(this.dbData);
        this.dbData.forEach((e) =>{
            this.countMap2.set(e.patient.name, e);
        });
    }

    findMatchesAndDuplicates(){
        console.log(this.countMap1);
        console.log(this.countMap2);

        this.countMap1.forEach((count1, e:any) => {
            console.log(count1.name)
            const count2 = this.countMap2.get(count1.name);
            console.log(count2);
            if(e.includes(count2) && count2 != 0) {
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