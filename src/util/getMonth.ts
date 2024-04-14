export const getMonth = (month:number) => {
    const date = new Date();

    const year = date.getFullYear();//윤년 판단 용.

    let gteDay;

    if(month<8){ //8월 이전
        month != 2 //2월인지 아닌지 확인
            ? month%2 == 0 //2월이 아니면 이대로
                ? gteDay = 30
                : gteDay = 31
            : year%4 == 0 //2월일 경우 윤년 확인 
                ? gteDay = 29
                : gteDay = 28
    }else{ //8월 부터
        month%2 == 0 ? gteDay = 31 : gteDay = 30
    }

    let monthStr = month<10 ? `0${month}` : month.toString();
    const dayObj = {
        lte : `${year}-${monthStr}-01`,
        gte : `${year}-${monthStr}-${gteDay}`
    };

    return dayObj;
   
}