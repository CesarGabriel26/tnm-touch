import { Category } from "../category/category.model";

export const ProductType = {
  NORMAL: 0,
  VARIATION: 1,
  COMBO: 2,
  PIZZA: 3,
  INGREDIENT: 4,
  SUB_PRODUCT: 5,
  ADDITIONAL: 6,
  BORDER: 7,
  DOUGH: 8
} as const;

export type ProductType = typeof ProductType[keyof typeof ProductType];

export type CatalogShortcut = {
  _id: string;
  createdAt: string;
  updatedAt: string | null;
  version: string;
  companyId: string;
  productId: string;
  name: string;
  photo: string | null;
  description: string;
  prices: number[];
  productType: ProductType;
  isActive: boolean;
  isAvailable: boolean;
  isDeliveryActive: boolean;
  isLocalActive: boolean;
  categoryId: string;
  variationId: string | null;
  category?: Category;
}

export type CatalogItem = {
  _id: string;
  name: string;
  items: Array<CatalogShortcut>
}

export const ProductTypeDescriptions: Record<ProductType, string> = {
  [ProductType.NORMAL]: "Normal",
  [ProductType.VARIATION]: "Variação",
  [ProductType.COMBO]: "Combo",
  [ProductType.PIZZA]: "Pizza",
  [ProductType.INGREDIENT]: "Ingrediente",
  [ProductType.SUB_PRODUCT]: "Subproduto",
  [ProductType.ADDITIONAL]: "Adicional",
  [ProductType.BORDER]: "Borda",
  [ProductType.DOUGH]: "Massa"
};