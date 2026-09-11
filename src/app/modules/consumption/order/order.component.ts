import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/product/product.model';
import { Category } from '../../../models/category/category.model';
import { CategoryService } from '../../../services/category.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingOverlayService } from '../../../services/loading-overlay.service';
import { ProductType } from '../../../models/order/catalogItem';
import { TableTicket } from '../../../models/table-ticket';
import { IOrderItem } from '../../../models/order/orderItem';
import { ActivatedRoute, Router } from '@angular/router';
import { TableTicketService } from '../../../services/tableticket.service';
import { OrderProductCatalogComponent } from './components/order-product-catalog/order-product-catalog.component';
import { OrderTicketHeaderComponent } from './components/order-ticket-header/order-ticket-header.component';
import { OrderDraftService } from '../../../services/order/order-draft.service';

@Component({
  selector: 'app-order.component',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    OrderProductCatalogComponent,
    OrderTicketHeaderComponent,
  ],
  templateUrl: './order.component.html',
  styleUrl: './order.component.css',
})
export class OrderComponent {
  tableTicket = signal<TableTicket | null>(null);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  search = new FormControl<string | null>('');
  selectedCategory = new FormControl<string | null>('');

  draftItems = computed(() => this.orderDraft.items());
  draftTotal = computed(() => this.orderDraft.total());
  draftCount = computed(() => this.orderDraft.count());
  draftQuantities = computed(() => this.orderDraft.quantitiesByProduct());

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly orderDraft: OrderDraftService,
    private readonly loadingOverlayService: LoadingOverlayService,
    private readonly tableTicketService: TableTicketService,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {
    this.selectedCategory.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadProducts()
    })

    this.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.selectedCategory.patchValue('', { emitEvent: false })
      this.loadProducts()
    })

    this.loadTable();
    this.loadCategories()
    this.loadProducts()
  }

  private loadTable() {
    const tableTicketId = this.route.snapshot.paramMap.get('id');

    if (!tableTicketId) {
      this.router.navigate(['/home']);
      return;
    }

    this.loadingOverlayService.show('Carregando atendimento');
    this.tableTicketService.get(tableTicketId).subscribe({
      next: (tableTicket) => {
        this.tableTicket.set(tableTicket);
        this.orderDraft.startOrder(tableTicket);
        this.loadingOverlayService.hide();
      },
      error: (err) => {
        this.loadingOverlayService.error(err?.message || 'Nao foi possivel carregar o atendimento');
      },
    });
  }

  loadProducts() {
    const categoryId = this.selectedCategory.value;
    const productFilters = {
      search: (this.search.value || '').toLowerCase(),
      companyId: localStorage.getItem('@companyId')!,
      isActive: true,
      isAvailable: true,
      enableLocal: true,
      productType: {
        blackList: [
          ProductType.INGREDIENT,
          ProductType.ADDITIONAL,
          ProductType.BORDER,
          ProductType.DOUGH,
          ProductType.ADDITIONAL
        ]
      }
    };

    this.loadingOverlayService.show('Carregando produtos');

    const request$ = categoryId
      ? this.productService.getByCategory(categoryId, productFilters)
      : this.productService.getAll(productFilters);

    request$.subscribe({
      next: (products) => {
        this.products.set(products);
        this.loadingOverlayService.hide();
      },
      error: (err) => {
        this.loadingOverlayService.error(err?.message || 'Nao foi possivel carregar os produtos');
      }
    });
  }

  loadCategories() {
    this.loadingOverlayService.show('Carregando categorias');
    this.categoryService.getAll().subscribe({
      next: (categories) => {
        this.categories.set(categories.items);
        this.loadingOverlayService.hide();
      },
      error: (err) => {
        this.loadingOverlayService.error(err?.message || 'Nao foi possivel carregar as categorias');
      }
    })
  }

  addItem(item: IOrderItem) {
    const tableTicket = this.tableTicket();
    if (!tableTicket) return;

    this.orderDraft.add(tableTicket, item);
  }

  openBasket() {
    this.router.navigate(['/basket']);
  }
}
