import { Product } from "../product/product.model";
import { ProductType } from "./catalogItem";

export type OrderItemComplementDataType = {
  _id: string;
  pdvId: string;
  name: string;
  price?: number;
  variations?: {
    name: string;
    pdvId: string;
    options: Array<{
      _id?: string;
      pdvId: string;
      variationItemPdvId: string;
      name: string;
      price: number;
    }>;
  };
};

export type OrderItemComplementType = {
  _id: string;
  name: string;
  maxSelection: number;
  data: Array<OrderItemComplementDataType>;
};

export type OrderItemDataType = {
  _id: string;
  name: string;
  description: string;
  pdvId: string;
  productType: ProductType;
  variations?: Product['variations'];
  price: number;
  photo?: string;
  measure?: string;
};

export interface IOrderItem {
  itemType?: ProductType;
  data: Array<OrderItemDataType>;
  complements: Array<OrderItemComplementType>;
  variation: {
    pdvId: string;
    variationItemPdvId: string;
    name: string;
    qtdSelection: number;
    qtdSelectionChargeHigher: number;
  } | null;
  quantity: number;
  price: number;
  total: number;
  obs: string;
}
