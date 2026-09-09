import { signal } from "@angular/core";
import { Consumption } from "../consumption";
import { Product } from "../product/product.model";

interface NewConsumption extends Consumption {
    selected: boolean;
}

export class OrderState {
    consumptions = signal<Consumption[]>([]);
    newConsumptions = signal<NewConsumption[]>([]);
    deletedConsumptions = signal<string[]>([]);

    keyOpen = signal<string>('')

    constructor(
        keyOpen: string
    ) {
        this.keyOpen.set(keyOpen);
    }

    addProduct(product: Product, quantity?: number) {
        const exists = this.newConsumptions().find(c => c.productId === product.id);
        if (exists) {
            exists.selected = !exists.selected;
        } else {
            this.newConsumptions.update(consumptions => [...consumptions, {
                selected: false,
                companyId: "",
                keyOpen: this.keyOpen(),
                productId: product.id,
                snapshot: product,
                dateTime: new Date().toISOString(),
                product: product.name,
                unityPrice: 0,
                unity: "",
                quantity: quantity || 1,
                obs: "",
                professionalId: "",
                status: 0
            }]);
        }
    }

    removeProduct(id: string) {
        const exists = this.newConsumptions().find(c => c.productId === id);
        if (exists) {
            this.newConsumptions.update(consumptions => consumptions.filter(c => c.productId !== id));
        }
    }

    removeQuantity(id: string, quantity?: number) {
        const exists = this.newConsumptions().find(c => c.productId === id);
        if (exists) {
            if (quantity) {
                exists.quantity = quantity;
            } else {
                exists.quantity--;
            }
            if (exists.quantity <= 0) {
                this.removeProduct(id);
            }
        }
    }
}