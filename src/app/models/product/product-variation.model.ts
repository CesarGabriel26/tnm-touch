export interface ProductVariation {
    _id?: string
    variationItemId: string
    variationId: string
    name: string
    variationName?: string
    qtdSelection: number
    maxDivision?: number
    saleValue: number
    costValue: number
    thumbUrl?: string
    imageUrl?: string
    campaign?: any
}