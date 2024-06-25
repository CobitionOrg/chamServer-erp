export const dateUtil = (todayDate:string) => {
    let today = new Date(todayDate);
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();  // 날짜
    let hours = today.getHours().toString(); // 시
    let minutes = today.getMinutes();  // 분
    let seconds = today.getSeconds();  // 초

    console.log(today.getHours());
    let startTime = new Date(year + '/' + month + '/' + date + ' ' + hours + ':' + minutes + ':' + seconds);
    console.log(startTime);
    return startTime;
}

export const todayDate = (todayDate:string) => {
    let today = new Date(todayDate);
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();
    
    let attendanceDate = new Date(year + '/' + month + '/' + date);
    console.log(attendanceDate + '!!!!!!!!!!!!');
    return attendanceDate;
}

export const getDateString = (todayDate:string) => {
    let today = new Date(todayDate);
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();

    let attendanceDate = `${year}/${month}/${date}`;

    return attendanceDate;

}
/**
 * 지각 여부 판단
 * @param dateTime 
 * @returns boolean
 */
export const tardy  = (dateTime:string) :boolean=> {
    let date = new Date(dateTime); //출근 시간
    let startTime = new Date(date.getTime()+ 9 * 60 * 60 * 1000); 

    console.log('=======================');
    console.log(startTime);
    let startHour = startTime.getUTCHours();
    console.log('////////////////');
    console.log(startHour);
    if(startHour<9){
        return false;
    }else if (startHour === 9) {
        let startMin = startTime.getUTCMinutes();
        console.log(startMin);
        return startMin !== 0;
    } else {
        return true;
    }
}