interface OrderItems {
  item: string[];
  type: string;
}

export const sortItems = (list: any[]) => {
  return list.map((order) => {
    return {
      ...order,
      orderItems: order.orderItems.sort((a: OrderItems, b: OrderItems) => {
        if (a.item < b.item) {
          return -1;
        }
        if (a.item > b.item) {
          return 1;
        }
        return 0;
      }),
    };
  });
};


// 정렬 함수 정의
export const sortAllItems = (a, b) => {
  const aMatch = a.item.match(/^(\d+)개월/);
  const bMatch = b.item.match(/^(\d+)개월/);

  if (aMatch && bMatch) {
      // 둘 다 n개월로 시작하면 숫자로 비교
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
  } else if (aMatch) {
      // a만 n개월로 시작하면 a가 먼저
      return -1;
  } else if (bMatch) {
      // b만 n개월로 시작하면 b가 먼저
      return 1;
  } else if (a.item.startsWith('쎈') && b.item.startsWith('쎈')) {
      // 둘 다 '쎈'으로 시작하면 숫자로 비교
      const aNum = a.item.match(/\d+개월/);
      const bNum = b.item.match(/\d+개월/);
      if (aNum && bNum) {
          return parseInt(aNum[0]) - parseInt(bNum[0]);
      } else {
          return a.item.localeCompare(b.item);
      }
  } else if (a.item.startsWith('쎈')) {
      // a만 '쎈'으로 시작하면 b가 먼저
      return 1;
  } else if (b.item.startsWith('쎈')) {
      // b만 '쎈'으로 시작하면 a가 먼저
      return -1;
  } else {
      // 기본 문자열 비교
      return a.item.localeCompare(b.item);
  }
};