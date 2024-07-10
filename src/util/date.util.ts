export const getDateString = (todayDate:string) => {
    let today = new Date(todayDate);
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();

    let attendanceDate = `${year}/${month}/${date}`;

    return attendanceDate;

}