/**
 * 설문 경로 구수방 체크
 */
export const checkGSB = (route: string) => {
  const trimedRoute = route.split(' ').join('');
  let check = false;
  const keywords = ['구수방', '구미수다방', '구미맘카페', '구미맘'];
  keywords.forEach((e) => {
    if (trimedRoute.includes(e)) check = true;
  });
  return check;
};
