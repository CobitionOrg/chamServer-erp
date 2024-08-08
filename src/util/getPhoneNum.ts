export const getPhoneNum = (phoneNum: string) => {
    const part1 = phoneNum.slice(0, 3);
    const part2 = phoneNum.slice(3, 7);
    const part3 = phoneNum.slice(7);

    return `${part1}-${part2}-${part3}`;
}