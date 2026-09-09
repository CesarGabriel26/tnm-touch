import { GenericData } from "../../types/generic"

export interface VariationItem extends GenericData {
    name: string
    maxDivision: number
    variationId: string
}

export interface Variation extends GenericData {
    name: string
    companyId: string
    items: Array<VariationItem>
}
