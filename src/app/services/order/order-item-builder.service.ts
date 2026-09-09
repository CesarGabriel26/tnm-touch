import { Injectable } from '@angular/core';
import { Product } from '../../models/product/product.model';
import { ProductVariation } from '../../models/product/product-variation.model';
import { ProductType } from '../../models/order/catalogItem';
import { IOrderItem } from '../../models/order/orderItem';

@Injectable({ providedIn: 'root' })
export class OrderItemBuilderService {
  build(product: Product, quantity: number, variation?: ProductVariation | null, obs: string = ''): IOrderItem {
    const selectedVariation = variation ?? this.getDefaultVariation(product);
    const productId = this.getProductId(product);
    const price = this.getPrice(product, selectedVariation);

    return {
      itemType: product.productType as unknown as ProductType,
      data: [
        {
          _id: productId,
          name: product.name,
          pdvId: product.pdvId || productId,
          description: product.description || '',
          productType: product.productType as unknown as ProductType,
          price,
          photo: product.pictureUrl || product.thumbnailUrl || undefined,
          measure: product.measure || 'UN',
        },
      ],
      complements: [],
      variation: selectedVariation
        ? {
          name: selectedVariation.name || selectedVariation.variationName || '',
          pdvId: selectedVariation.variationId || '',
          variationItemPdvId: selectedVariation.variationItemId || '',
          qtdSelection: selectedVariation.qtdSelection || 1,
          qtdSelectionChargeHigher: 3,
        }
        : null,
      quantity,
      price,
      total: this.roundMoney(price * quantity),
      obs: obs.trim(),
    };
  }

  getDefaultVariation(product: Product): ProductVariation | null {
    return product.variations?.[0] ?? null;
  }

  getProductId(product: Product): string {
    return product.id || product._id;
  }

  getPrice(product: Product, variation?: ProductVariation | null): number {
    return Number(variation?.saleValue ?? product.variations?.[0]?.saleValue ?? 0);
  }

  roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
