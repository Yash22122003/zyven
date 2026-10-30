import { OrderStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.ACCEPTED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.ACCEPTED]: [
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP, // Can jump to ready if instant item
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.COLLECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COLLECTED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.EXPIRED]: [],
};

export function canTransitionOrder(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

export function isTerminalStatus(status: OrderStatus): boolean {
  const terminalStates: OrderStatus[] = [
    OrderStatus.COLLECTED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ];
  return terminalStates.includes(status);
}

export function shouldReleaseStockOnTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  // If moving from a reservation-holding state to a terminal cancellation/rejection
  const holdingStates: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
  ];
  const releasingStates: OrderStatus[] = [
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ];
  
  return holdingStates.includes(fromStatus) && releasingStates.includes(toStatus);
}

export function shouldFulfillStockOnTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  // Moving from holding state to COLLECTED -> permanently decrements quantity on hand and clears reservation
  return toStatus === OrderStatus.COLLECTED && fromStatus !== OrderStatus.COLLECTED;
}
