import { GenericData } from "../../types/generic"
import { Product } from "../product/product.model"

export interface Category extends GenericData {
    id: string;
    name: string
    createdAt: Date
    updatedAt?: Date
    products?: Array<Product>
    imageUrl?: string
}