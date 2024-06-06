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
