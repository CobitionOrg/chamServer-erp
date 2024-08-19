export const getOutage = (list) => {
    let outageList = [];

    for(let i =0; i<list.length; i++) {
        let outage = list[i].outage;

        let tempOutage = outage.split(' ');
        console.log(tempOutage);
        let month;
        let weight;
        try{
            month = parseInt(tempOutage[0].replace('달',''));
            weight = parseInt(tempOutage[1].replace('kg',''));

            // console.log(month);
            // console.log(weight);

            if(!isNaN(month) && !isNaN(weight)){
                if(weight>6){
                    outageList.push(list[i])
                }else{
                    if(month === 1) {
                        if(weight>=4) outageList.push(list[i]);
                    }else if(month === 2) {
                        if(weight>=5) outageList.push(list[i]);
                    }else if(month === 3) {
                        if(weight>=7) outageList.push(list[i]);
                    }
                }
            }

            if(outage == '후기대상목록에서 생성'){
                outageList.push(list[i]);
            }
        }catch(err){
            console.log(err);
        }
       
    }

    return outageList;
}


export const checkOutage = (outage: string) => {
    let tempOutage = outage.split(' ');

    let month;
    let weight;
    let outageFlag = false;

    try {
        month = parseInt(tempOutage[0].replace('달', ''));
        weight = parseInt(tempOutage[1].replace('kg', ''));

        if (weight > 6) {
            outageFlag = true;
        } else {
            if (month === 1) {
                if (weight >= 4) outageFlag = true;
            } else if (month === 2) {
                if (weight >= 5) outageFlag = true;
            } else if (month === 3) {
                if (weight >= 7) outageFlag = true;
            }
        }
    } catch (err) {
        //console.log(err);
    }

    return outageFlag;
}
