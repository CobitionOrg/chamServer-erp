import { getDateString } from "./date.util";

export const getSendTitle = (date) =>{
    const targetDays = ['Monday', 'Tuesday', 'Thursday', 'Friday'];
    const today = new Date(date);
    const todayDay = today.getDay();

    const targetIndices = targetDays.map(day => {
        switch(day.toLowerCase()){
            case 'monday' : return 1;
            case 'tuesday' : return 2;
            case 'thursday' : return 4;
            case 'friday' : return 5;
            default: return null
        }
    }).filter(i => i !== null);

    let colosetDate = null;
    let minDaysDiff = Infinity;

    targetIndices.forEach(targetIdx => {
        let daysDiff = (targetIdx - todayDay +7) % 7;
        if(daysDiff === 0){
            daysDiff = 7;
        }

        if(daysDiff < minDaysDiff){
            minDaysDiff = daysDiff;
            colosetDate = new Date(today.getTime() + daysDiff *24*60*60*1000);
        }
    });

    
    console.log(colosetDate);
    return getDateString(colosetDate);
}