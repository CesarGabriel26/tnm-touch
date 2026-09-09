import { Product } from "../product/product.model";
import { GenericData } from "../../types/generic";

export interface SalesCampaign extends GenericData {
    name: string;
    startDate: Date;
    endDate: Date;
    items: SalesCampaignItem[];
    isActive: boolean;
    isRunning?: boolean;
    isExpired?: boolean;
}

export interface SalesCampaignItem extends GenericData {
    prodictVariationId: string;
    saleValue: number;
    productId?: string;
    product?: Product;
    campaign?: SalesCampaign;
}

export type SalesCampaignFilters = Partial<SalesCampaign> & {
    onlyActive: boolean
    onlyRunning: boolean
};