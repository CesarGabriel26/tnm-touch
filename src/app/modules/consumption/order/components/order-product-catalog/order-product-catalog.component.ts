import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AvGridComponent } from '../../../../../components/angular-visuals/components/av-grid/grid.component';
import { AvButton } from '../../../../../components/angular-visuals/components/buttons';
import { AvInput } from '../../../../../components/angular-visuals/components/forms';
import { AvIcon } from '../../../../../components/angular-visuals/components/icons';
import { Category } from '../../../../../models/category/category.model';
import { IOrderItem } from '../../../../../models/order/orderItem';
import { Product } from '../../../../../models/product/product.model';
import { ProductVariation } from '../../../../../models/product/product-variation.model';
import { getPriceRange } from '../../../../../utils/product.utils';
import { OrderItemBuilderService } from '../../../../../services/order/order-item-builder.service';

@Component({
  selector: 'app-order-product-catalog',
  imports: [CommonModule, CurrencyPipe, FormsModule, ReactiveFormsModule, AvButton, AvGridComponent, AvIcon, AvInput],
  templateUrl: './order-product-catalog.component.html',
  styleUrl: './order-product-catalog.component.css',
})
export class OrderProductCatalogComponent {
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() searchControl: FormControl<string | null> = new FormControl('');
  @Input() categoryControl: FormControl<string | null> = new FormControl('');
  @Input() draftQuantities: Record<string, number> = {};

  @Output() itemAdd = new EventEmitter<IOrderItem>();

  selectedProduct = signal<Product | null>(null);
  selectedVariationId = signal('');
  quantity = signal(1);
  observation = signal('');

  constructor(readonly itemBuilder: OrderItemBuilderService) { }

  selectCategory(categoryId: string) {
    this.categoryControl.setValue(this.categoryControl.value === categoryId ? '' : categoryId);
  }

  openProduct(product: Product) {
    this.selectedProduct.set(product);
    this.selectedVariationId.set(this.itemBuilder.getDefaultVariation(product)?.variationItemId || '');
    this.quantity.set(1);
    this.observation.set('');
  }

  closeProduct() {
    this.selectedProduct.set(null);
  }

  increaseQuantity() {
    this.quantity.update((value) => value + 1);
  }

  decreaseQuantity() {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  addSelectedProduct() {
    const product = this.selectedProduct();
    if (!product) return;

    const item = this.itemBuilder.build(product, this.quantity(), this.selectedVariation(), this.observation());
    this.itemAdd.emit(item);
    this.closeProduct();
  }

  selectedVariation(): ProductVariation | null {
    const product = this.selectedProduct();
    if (!product) return null;

    return product.variations?.find((variation) => variation.variationItemId === this.selectedVariationId())
      ?? this.itemBuilder.getDefaultVariation(product);
  }

  imageUrl(product: Product): string {
    return product.pictureUrl || product.thumbnailUrl || 'assets/img/noimage.png';
  }

  productKey(product: Product): string {
    return this.itemBuilder.getProductId(product);
  }

  productPrice(product: Product): number {
    return this.itemBuilder.getPrice(product, this.itemBuilder.getDefaultVariation(product));
  }

  productPriceRange(product: Product) {
    return getPriceRange(product);
  }
}
