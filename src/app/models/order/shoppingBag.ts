import { IOrderItem } from "./orderItem";

export interface IShoppingBag {
  items: IOrderItem[];
  area: any;
  totalItems: number;
  total: number;
  deliveryFee: number;
  canDeliver: boolean;
  isFreeDelivery: boolean;
  minOrderValue: number;
}

export interface ShoppingBagResume {
  total: number;
  totalItems: number;
  items: IOrderItem[];
  area: any;
  hasData: boolean;
  deliveryFee: number;
  canDeliver: boolean;
  isFreeDelivery: boolean;
  minOrderValue: number;
}