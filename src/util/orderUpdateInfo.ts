export const orderUpdateInfo = (orderIpdateInfos: any) => {
    if (orderIpdateInfos.length > 0) {
        let temp = "";
        orderIpdateInfos.forEach((e: any) => {
            temp += `${e.info},`;
        });
        return temp;
    }
};