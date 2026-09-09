import { GenericData } from "../../types/generic"
import { ProductVariation } from "./product-variation.model"
import { Category } from "../category/category.model";

export enum PRODUCT_TYPES {
  NORMAL,
  VARIATION,
  COMBO,
  PIZZA,
  INGREDIENT,
  SUB_PRODUCT,
  ADDITIONAL,
  BORDER,
  DOUGH
}

export interface ProductCategory {
  _id: string;
  createdAt: string;
  categoryId: string;
  productId: string;
  category?: Category
}

export interface Product extends GenericData {
  name: string
  id: string
  pdvId: string
  measure: any
  description: string
  variations: Array<ProductVariation>
  productType: PRODUCT_TYPES
  gtin: string
  isActive: boolean
  isAvailable: boolean
  enableLocal: boolean
  enableOnlineSale: boolean
  enableStockControl: boolean
  complementsIds: Array<string> | null
  stockMovementEvent: any
  ingredients?: Array<any>
  categories?: Array<ProductCategory>
  complements?: Array<any>
  maxQtd?: number | null;
  keywords?: string
  thumbnailUrl: string | null
  pictureUrl: string | null
  cachePath: string | null;
  items?: Array<any>
}