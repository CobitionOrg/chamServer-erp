export const getOutage = (list) => {
    let outageList = [];

    for(let i =0; i<list.length; i++) {
        let outage = list[i].outage;

        let tempOutage = outage.split(' ');
        let month = parseInt(tempOutage[0].replace('달',''));
        let weight = parseInt(tempOutage[1].replace('kg',''));

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

    return outageList;
}
