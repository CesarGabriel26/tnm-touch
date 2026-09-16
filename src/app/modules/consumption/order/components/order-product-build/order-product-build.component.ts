import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, OnChanges, Output, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import currency from 'currency.js';
import { forkJoin } from 'rxjs';
import { AvButton } from '../../../../../components/angular-visuals/components/buttons';
import { AvIcon } from '../../../../../components/angular-visuals/components/icons';
import { SearchableListComponent, ListItem } from '../../../../../components/searchable-list/searchable-list.component';
import { Complement } from '../../../../../models/product/complement.model';
import { Product, PRODUCT_TYPES } from '../../../../../models/product/product.model';
import { ProductVariation } from '../../../../../models/product/product-variation.model';
import { Variation } from '../../../../../models/product/variation.model';
import { ProductType } from '../../../../../models/order/catalogItem';
import { IOrderItem, OrderItemComplementType } from '../../../../../models/order/orderItem';
import { ComplementsService } from '../../../../../services/complements.service';
import { ProductService } from '../../../../../services/product.service';
import { VariationsService } from '../../../../../services/variations.service';
import { OrderItemBuilderService } from '../../../../../services/order/order-item-builder.service';

@Component({
  selector: 'app-order-product-build',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, AvButton, AvIcon, SearchableListComponent],
  templateUrl: './order-product-build.component.html',
  styleUrl: './order-product-build.component.css',
})
export class OrderProductBuildComponent implements OnChanges {
  visible = input.required<boolean>();
  product = input.required<Product | null>();

  @Output() close = new EventEmitter<void>();
  @Output() itemAdd = new EventEmitter<IOrderItem>();

  private productService = inject(ProductService);
  private complementsService = inject(ComplementsService);
  private variationsService = inject(VariationsService);
  readonly itemBuilder = inject(OrderItemBuilderService);

  // Data Signals
  adicionais = signal<Product[]>([]);
  borders = signal<Product[]>([]);
  SearchList = signal<ListItem[]>([]);
  complements = signal<Complement[]>([]);
  comboItems = signal<Complement[]>([]);
  variationGroups = signal<{ id: string; name: string }[]>([]);
  variationGroupsData = signal<Variation[]>([]);
  variations = signal<ProductVariation[]>([]);

  // State Signals
  currentStep = signal(0);
  variationItemId = signal<string>('');
  selectedBorderId = signal<string | null>(null);
  selectedComplements = signal<Record<string, string[]>>({});
  orderItem = signal<IOrderItem>({
    itemType: ProductType.NORMAL,
    data: [],
    complements: [],
    variation: null,
    quantity: 1,
    price: 0,
    total: 0,
    obs: '',
  });

  private _lastProduct: Product | null = null;

  get activeProduct(): Product | null {
    return this.product() ?? this._lastProduct;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const currentProd = this.product();
    if (changes['product'] && currentProd) {
      this._lastProduct = currentProd;
      this.resetAndLoad(currentProd);
    }
  }

  resetAndLoad(prod: Product): void {
    this.currentStep.set(0);
    this.variationItemId.set('');
    this.selectedBorderId.set(null);
    this.selectedComplements.set({});
    this.SearchList.set([]);
    this.complements.set([]);
    this.comboItems.set([]);
    this.variationGroups.set([]);
    this.variationGroupsData.set([]);

    // Fetch additionals & borders
    this.productService.getAll({ productType: { whiteList: [ProductType.ADDITIONAL] }, isAvailable: true }).subscribe({
      next: (adds) => this.adicionais.set(adds || []),
      error: (err) => console.error('Erro ao buscar adicionais:', err),
    });

    this.productService.getAll({ productType: { whiteList: [ProductType.BORDER] }, isAvailable: true }).subscribe({
      next: (bds) => this.borders.set(bds || []),
      error: (err) => console.error('Erro ao buscar bordas:', err),
    });

    // Handle Combo Items
    if (prod.items?.length) {
      const mappedComboItems: Complement[] = prod.items.map((item: any) => ({
        _id: item._id || item.id || '',
        name: item.name,
        maxSelection: item.qtdselection || item.maxSelection || 1,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        options: (item.options || []).map((d: any) => ({
          _id: d.product?._id || d.product?.id || d.componentid,
          name: d.product?.name || d.product?.product || 'Item',
          price: d.product?.prices?.cashpayment || d.price || 0,
          variationName: d.product?.variations?.[0]?.id !== '2037a69c-e415-44c4-a7cf-caa37518ad74'
            ? d.product?.variations?.[0]?.name
            : ''
        }))
      }));
      this.comboItems.set(mappedComboItems);
    }

    // Load Complements
    if (prod.complementsIds?.length) {
      this.complementsService.get(prod.complementsIds).subscribe({
        next: (comps) => this.complements.set(comps || []),
        error: (err) => console.error('Erro ao carregar complementos:', err),
      });
    }

    const prodVariations = prod.variations || [];
    this.variations.set(prodVariations);

    if (prodVariations.length > 0) {
      const defaultVariation = prodVariations[0];
      this.variationItemId.set(defaultVariation.variationItemId);
      this.initializeOrderItem(prod, defaultVariation);
      this.loadVariationGroups(prodVariations);
    } else {
      this.initializeOrderItemSimple(prod);
    }
  }

  private initializeOrderItem(prod: Product, variation: ProductVariation): void {
    const prodId = prod.id || prod._id;
    this.orderItem.set({
      itemType: (prod.productType as unknown) as ProductType,
      data: [
        {
          _id: prodId,
          name: prod.name,
          pdvId: prod.pdvId || prodId,
          description: prod.description || '',
          productType: (prod.productType as unknown) as ProductType,
          price: Number(variation.saleValue) || 0,
          photo: prod.pictureUrl || prod.thumbnailUrl || undefined,
          measure: prod.measure || 'UN',
        },
      ],
      variation: {
        name: variation.name || variation.variationName || '',
        pdvId: variation.variationId || '',
        variationItemPdvId: variation.variationItemId || '',
        qtdSelection: variation.qtdSelection || 1,
        qtdSelectionChargeHigher: 3,
      },
      complements: [],
      quantity: 1,
      price: Number(variation.saleValue) || 0,
      total: Number(variation.saleValue) || 0,
      obs: '',
    });
  }

  private initializeOrderItemSimple(prod: Product): void {
    const prodId = prod.id || prod._id;
    const defaultVar = prod.variations?.[0];
    const price = Number(defaultVar?.saleValue) || 0;

    this.orderItem.set({
      itemType: (prod.productType as unknown) as ProductType,
      data: [
        {
          _id: prodId,
          name: prod.name,
          pdvId: prod.pdvId || prodId,
          description: prod.description || '',
          productType: (prod.productType as unknown) as ProductType,
          price,
          photo: prod.pictureUrl || prod.thumbnailUrl || undefined,
          measure: prod.measure || 'UN',
        },
      ],
      variation: defaultVar
        ? {
            name: defaultVar.name || defaultVar.variationName || '',
            pdvId: defaultVar.variationId || '',
            variationItemPdvId: defaultVar.variationItemId || '',
            qtdSelection: defaultVar.qtdSelection || 1,
            qtdSelectionChargeHigher: 3,
          }
        : null,
      complements: [],
      quantity: 1,
      price,
      total: price,
      obs: '',
    });
  }

  private loadVariationGroups(variations: ProductVariation[]): void {
    const uniqueGroupIds = Array.from(new Set(variations.map((v) => v.variationId).filter(Boolean)));
    if (!uniqueGroupIds.length) return;

    const observables = uniqueGroupIds.map((id) => this.variationsService.get(id));

    forkJoin(observables).subscribe({
      next: (groups) => {
        this.variationGroupsData.set(groups.filter((g) => g && g._id));
        const groupList = groups.map((g) => {
          const matchingVar = variations.find((v) => v.variationId === g._id);
          return { id: g._id, name: matchingVar?.variationName || g.name || '' };
        });
        this.variationGroups.set(groupList);
      },
      error: (err) => console.error('Erro ao carregar grupos de variação:', err),
    });
  }

  variationChange(itemId: string): void {
    const variation = this.variations().find((v) => v.variationItemId === itemId);
    if (!variation) return;

    this.variationItemId.set(itemId);

    this.orderItem.update((prev) => {
      const newData = [...prev.data];
      if (newData.length > 0) {
        newData[0] = { ...newData[0], price: Number(variation.saleValue) || 0 };
      }

      const complements = prev.complements.map((c) => {
        if (c.name === 'Adicionais') {
          return { ...c, maxSelection: variation.qtdSelection || 1 };
        }
        return c;
      });

      return {
        ...prev,
        data: newData,
        complements,
        variation: {
          name: variation.name || variation.variationName || '',
          pdvId: variation.variationId || '',
          variationItemPdvId: variation.variationItemId || '',
          qtdSelection: variation.qtdSelection || 1,
          qtdSelectionChargeHigher: prev.variation?.qtdSelectionChargeHigher || 3,
        },
      };
    });
  }

  hasDivision = computed(() => {
    const itemId = this.variationItemId();
    const variation = this.variations().find((v) => v.variationItemId === itemId);
    if (variation?.maxDivision !== undefined && variation.maxDivision > 0) return variation.maxDivision;

    const vId = this.orderItem().variation?.pdvId;
    const group = this.variationGroupsData().find((g) => g._id === vId);

    return group?.items?.find((i) => i._id === itemId)?.maxDivision || 1;
  });

  filteredFlavors = computed(() => {
    return this.orderItem().data.filter((item) => (item.productType as unknown) !== ProductType.ADDITIONAL);
  });

  getAdditionalForVariation = computed(() => {
    const itemId = this.variationItemId();
    return this.adicionais().reduce((acc, add) => {
      const v = add.variations?.find((v) => v.variationItemId === itemId);
      if (!v) return acc;

      const addId = add.id || add._id;
      acc.push({
        _id: addId,
        id: addId,
        pictureUrl: add.pictureUrl || add.thumbnailUrl || 'assets/img/noimage.png',
        name: add.name,
        price: Number(v.saleValue) || 0,
        maxQtd: v.qtdSelection || 99,
        qty: this.getQtyAdditional(addId),
      });
      return acc;
    }, [] as any[]);
  });

  getQtyAdditional(id: string): number {
    const addsGroup = this.orderItem().complements.find((c) => c.name === 'Adicionais');
    return addsGroup?.data.filter((i) => i._id === id || i.pdvId === id).length || 0;
  }

  addAdditional(add: any): void {
    const addId = add.id || add._id;
    const p = this.adicionais().find((a) => (a.id || a._id) === addId);
    if (!p) return;

    this.orderItem.update((prev) => {
      const complements = [...prev.complements];
      let addsGroup = complements.find((c) => c.name === 'Adicionais');
      const maxSelection = prev.variation?.qtdSelection || 1;

      if (!addsGroup) {
        addsGroup = {
          _id: 'group-adicionais',
          name: 'Adicionais',
          maxSelection: maxSelection,
          data: [],
        };
        complements.push(addsGroup);
      }

      if (addsGroup.data.length >= addsGroup.maxSelection) {
        return prev;
      }

      addsGroup.data.push({
        _id: addId,
        name: p.name,
        pdvId: addId,
        price: Number(add.price) || 0,
        variations: p.variations && p.variations.length > 0
          ? {
              name: p.variations[0].variationName || '',
              pdvId: p.variations[0].variationId || '',
              options: p.variations.map((v) => ({
                _id: v._id || v.variationItemId,
                pdvId: v.variationId || '',
                variationItemPdvId: v.variationItemId,
                name: v.name || '',
                price: Number(v.saleValue) || 0,
              })),
            }
          : undefined,
      });

      return { ...prev, complements };
    });
  }

  removeAdditional(id: string): void {
    this.orderItem.update((prev) => {
      const complements = [...prev.complements];
      const addsGroup = complements.find((c) => c.name === 'Adicionais');
      if (!addsGroup) return prev;

      const idx = addsGroup.data.findIndex((i) => i._id === id || i.pdvId === id);
      if (idx === -1) return prev;

      addsGroup.data.splice(idx, 1);
      return { ...prev, complements };
    });
  }

  removeItem(index: number): void {
    const flavors = this.filteredFlavors();
    if (index < 0 || index >= flavors.length) return;

    const itemToRemove = flavors[index];
    this.orderItem.update((prev) => {
      const idx = prev.data.indexOf(itemToRemove);
      if (idx === -1) return prev;
      const newData = [...prev.data];
      newData.splice(idx, 1);
      return { ...prev, data: newData };
    });
  }

  toggleComplement(groupId: string, itemId: string, max: number): void {
    this.selectedComplements.update((prev) => {
      const current = prev[groupId] || [];
      const exists = current.includes(itemId);
      let updated: string[];

      if (exists) {
        updated = current.filter((id) => id !== itemId);
      } else {
        if (max === 1) updated = [itemId];
        else if (current.length < max) updated = [...current, itemId];
        else return prev;
      }

      return { ...prev, [groupId]: updated };
    });
  }

  isComplementsValid = computed(() => {
    const selected = this.selectedComplements();
    const compsOk = this.complements().every((g) => {
      const groupId = g._id;
      const count = selected[groupId]?.length || 0;
      if (g.isRequired && count === 0) return false;
      return count <= g.maxSelection;
    });

    const comboOk = this.comboItems().every((g) => {
      const groupId = g._id;
      const count = selected[groupId]?.length || 0;
      if (g.isRequired && count === 0) return false;
      return count <= g.maxSelection;
    });

    return compsOk && comboOk;
  });

  calcTotalPrice = computed(() => {
    let sum = currency(0);
    const { data } = this.orderItem();
    const flavors = data.filter((i: any) => (i.productType as unknown) !== ProductType.ADDITIONAL);
    const additionals = data.filter((i: any) => (i.productType as unknown) === ProductType.ADDITIONAL);

    const p = this.activeProduct;
    if (p?.productType === (PRODUCT_TYPES.PIZZA as unknown as PRODUCT_TYPES) && flavors.length > 0) {
      const flavorSum = flavors.reduce((a, b: any) => a.add(Number(b.price) || 0), currency(0));
      sum = sum.add(flavorSum.divide(flavors.length));
    } else {
      sum = flavors.reduce((a, b: any) => a.add(Number(b.price) || 0), sum);
    }

    sum = additionals.reduce((a, b: any) => a.add(Number(b.price) || 0), sum);

    const prevComps = this.orderItem().complements;
    prevComps.forEach((group) => {
      group.data.forEach((item) => {
        sum = sum.add(Number(item.price) || 0);
      });
    });

    const selected = this.selectedComplements();

    // Complements loop
    this.complements().forEach((g) => {
      const groupId = g._id;
      (selected[groupId] || []).forEach((id) => {
        const opt = g.options.find((o: any) => (o.id || o._id) === id);
        if (opt) sum = sum.add(Number(opt.price) || 0);
      });
    });

    // Combo Items loop
    this.comboItems().forEach((g) => {
      const groupId = g._id;
      (selected[groupId] || []).forEach((id) => {
        const opt = g.options.find((o: any) => (o.id || o._id) === id);
        if (opt) sum = sum.add(Number(opt.price) || 0);
      });
    });

    const borderId = this.selectedBorderId();
    if (borderId) {
      const border = this.borders().find((b) => (b.id || b._id) === borderId);
      if (border) {
        const pizzaVarItemId = this.variationItemId();
        const borderVar = border.variations?.find((v) => v.variationItemId === pizzaVarItemId);
        sum = sum.add(Number(borderVar?.saleValue || border.variations?.[0]?.saleValue) || 0);
      }
    }

    return sum.value;
  });

  qtdChanged(val: any): void {
    const q = Math.max(1, Number(val) || 1);
    this.orderItem.update((prev) => ({ ...prev, quantity: q }));
  }

  selectSaborClicked(): void {
    const currentProdType = this.activeProduct?.productType;
    this.productService.getAll({ isAvailable: true }).subscribe({
      next: (res) => {
        const itemId = this.variationItemId();
        const list: ListItem[] = (res || [])
          .filter((p) => (p.productType as unknown) !== ProductType.ADDITIONAL)
          .filter((p) => (p.productType as unknown) === (currentProdType as unknown) || (p.productType as unknown) === ProductType.NORMAL)
          .map((p) => {
            const v = p.variations?.find((va) => va.variationItemId === itemId);
            if (!v) return null;
            const pId = p.id || p._id;
            return {
              name: p.name,
              variation: itemId,
              id: pId,
              salePrice: Number(v.saleValue) || 0,
              photo: p.pictureUrl || p.thumbnailUrl || '',
            };
          })
          .filter((x): x is ListItem => x !== null);
        this.SearchList.set(list);
      },
    });
  }

  SearchListItemSelected(res: { id: string; variation: string }): void {
    this.productService.get(res.id).subscribe({
      next: (data) => {
        if (!data) return;
        const v = data.variations?.find((va) => va.variationItemId === res.variation);
        const dataId = data.id || data._id;
        this.orderItem.update((prev) => ({
          ...prev,
          data: [
            ...prev.data,
            {
              _id: dataId,
              name: data.name,
              pdvId: data.pdvId || dataId,
              description: data.description || '',
              productType: (data.productType as unknown) as ProductType,
              price: Number(v?.saleValue) || 0,
              photo: data.pictureUrl || data.thumbnailUrl || undefined,
              measure: data.measure || 'UN',
            },
          ],
        }));
        this.SearchList.set([]);
      },
    });
  }

  closeSearchList(): void {
    this.SearchList.set([]);
  }

  availableSteps = computed(() => {
    const steps = [];
    if (this.variations().length > 1) steps.push({ id: 'variation', label: 'Tamanho' });
    if (this.hasDivision() > 1) {
      steps.push({ id: 'flavors', label: 'Sabores' });
    }
    if (this.activeProduct?.productType === (PRODUCT_TYPES.PIZZA as unknown as PRODUCT_TYPES) && this.borders().length > 0) {
      steps.push({ id: 'borders', label: 'Bordas' });
    }
    if (this.getAdditionalForVariation().length > 0) steps.push({ id: 'additionals', label: 'Adicionais' });
    if (this.comboItems().length > 0) steps.push({ id: 'combo', label: 'Itens do Combo' });
    if (this.complements().length > 0) steps.push({ id: 'complements', label: 'Complementos' });
    steps.push({ id: 'notes', label: 'Observações' });
    return steps;
  });

  currentStepId = computed(() => {
    const steps = this.availableSteps();
    const idx = this.currentStep();
    return steps[idx]?.id || 'notes';
  });

  nextClicked(): void {
    if (this.currentStep() >= this.availableSteps().length - 1) {
      this.done();
    } else {
      this.currentStep.update((v) => v + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((v) => v - 1);
    }
  }

  setStep(idx: number): void {
    this.currentStep.set(idx);
  }

  selectBorder(borderId: string): void {
    if (this.selectedBorderId() === borderId) {
      this.selectedBorderId.set(null);
    } else {
      this.selectedBorderId.set(borderId);
    }
  }

  getBorderPrice(border: Product): number {
    const pizzaVarItemId = this.variationItemId();
    const borderVar = border.variations?.find((v) => v.variationItemId === pizzaVarItemId);
    return Number(borderVar?.saleValue || border.variations?.[0]?.saleValue) || 0;
  }

  closeProduct(): void {
    this.close.emit();
  }

  done(): void {
    const selected = this.selectedComplements();
    const selectedComps = this.complements().filter((g) => selected[g._id]?.length);
    const selectedCombo = this.comboItems().filter((g) => selected[g._id]?.length);

    const complementGroups: OrderItemComplementType[] = [...selectedComps, ...selectedCombo].map((g) => {
      const gId = g._id;
      return {
        _id: gId,
        name: g.name,
        maxSelection: g.maxSelection,
        data: selected[gId].map((id) => {
          const opt = g.options.find((o: any) => (o.id || o._id) === id)!;
          const optId = opt.id || opt._id;
          return {
            _id: optId,
            name: opt.name,
            price: Number(opt.price) || 0,
            pdvId: optId,
            variations: opt.variationName ? {
              name: opt.variationName,
              pdvId: optId,
              options: [{
                _id: optId,
                pdvId: optId,
                variationItemPdvId: optId,
                name: opt.name,
                price: Number(opt.price) || 0
              }]
            } : undefined
          };
        }),
      };
    });

    const price = this.calcTotalPrice();
    const quantity = this.orderItem().quantity;
    const updated: IOrderItem = {
      ...this.orderItem(),
      complements: [
        ...this.orderItem().complements,
        ...complementGroups,
      ],
      price: price,
      total: currency(price).multiply(quantity).value,
    };

    const borderId = this.selectedBorderId();
    if (borderId) {
      const border = this.borders().find((b) => (b.id || b._id) === borderId);
      if (border) {
        const bId = border.id || border._id;
        const pizzaVarItemId = this.variationItemId();
        const borderVar = border.variations?.find((v) => v.variationItemId === pizzaVarItemId);
        updated.complements.push({
          _id: 'group-border',
          name: 'Borda',
          maxSelection: 1,
          data: [
            {
              _id: bId,
              name: border.name,
              pdvId: bId,
              price: Number(borderVar?.saleValue || border.variations?.[0]?.saleValue) || 0,
            },
          ],
        });
      }
    }

    this.orderItem.set(updated);
    this.itemAdd.emit(updated);
    this.closeProduct();
  }
}
