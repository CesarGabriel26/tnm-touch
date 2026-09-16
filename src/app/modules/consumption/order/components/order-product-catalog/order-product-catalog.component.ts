import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AvGridComponent } from '../../../../../components/angular-visuals/components/av-grid/grid.component';
import { AvInput } from '../../../../../components/angular-visuals/components/forms';
import { AvIcon } from '../../../../../components/angular-visuals/components/icons';
import { Category } from '../../../../../models/category/category.model';
import { IOrderItem } from '../../../../../models/order/orderItem';
import { Product } from '../../../../../models/product/product.model';
import { getPriceRange } from '../../../../../utils/product.utils';
import { OrderItemBuilderService } from '../../../../../services/order/order-item-builder.service';
import { OrderProductBuildComponent } from '../order-product-build/order-product-build.component';

@Component({
  selector: 'app-order-product-catalog',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AvGridComponent, AvIcon, AvInput, OrderProductBuildComponent],
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

  constructor(readonly itemBuilder: OrderItemBuilderService) { }

  selectCategory(categoryId: string) {
    this.categoryControl.setValue(this.categoryControl.value === categoryId ? '' : categoryId);
  }

  openProduct(product: Product) {
    this.selectedProduct.set(product);
  }

  closeProduct() {
    this.selectedProduct.set(null);
  }

  onItemAdd(item: IOrderItem) {
    this.itemAdd.emit(item);
    this.closeProduct();
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
