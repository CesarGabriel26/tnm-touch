import { Category } from "../category/category.model";


export interface ProductCategory {
    _id: string;
    createdAt: string;
    categoryId: string;
    productId: string;
    category?: Category
}