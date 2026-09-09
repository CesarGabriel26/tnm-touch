import { Product } from "../models/product/product.model";
import { OrderItemComplementType } from "../models/order/orderItem";

export function getPriceRange(product: Product) {
    if (!product.variations) {
        return { min: 0, max: 0 }
    }

    const values = product.variations.map(item => item.saleValue);

    if (values.length === 0) {
        return { min: 0, max: 0 }
    }

    const min = Math.min(...values);
    let max = -1

    if (values.length > 1) {
        max = Math.max(...values);
    }

    return { min, max }
}

export function areComplementsEqual(comp1: OrderItemComplementType[], comp2: OrderItemComplementType[]): boolean {
    // Ordena pelo _id para garantir que a ordem de clique do usuário não quebre a comparação
    const sorted1 = [...comp1].sort((a, b) => a._id.localeCompare(b._id));
    const sorted2 = [...comp2].sort((a, b) => a._id.localeCompare(b._id));

    for (let i = 0; i < sorted1.length; i++) {
        const c1 = sorted1[i];
        const c2 = sorted2[i];

        // Verifica se é a mesma categoria de complemento
        if (c1._id !== c2._id) return false;
        if (c1.data.length !== c2.data.length) return false;

        // Ordena os itens selecionados dentro do complemento (ex: sabores escolhidos, adicionais)
        const data1 = [...c1.data].sort((a, b) => a._id.localeCompare(b._id));
        const data2 = [...c2.data].sort((a, b) => a._id.localeCompare(b._id));

        for (let j = 0; j < data1.length; j++) {
            const d1 = data1[j];
            const d2 = data2[j];

            // Valida o item do complemento
            if (d1._id !== d2._id) return false;

            // Se houver variações dentro do complemento (ex: tamanho do adicional), valida as opções
            if (d1.variations || d2.variations) {
                const options1 = d1.variations?.options || [];
                const options2 = d2.variations?.options || [];

                if (options1.length !== options2.length) return false;

                const optSorted1 = [...options1].sort((a, b) => (a._id || '').localeCompare(b._id || ''));
                const optSorted2 = [...options2].sort((a, b) => (a._id || '').localeCompare(b._id || ''));

                for (let k = 0; k < optSorted1.length; k++) {
                    if (optSorted1[k].variationItemPdvId !== optSorted2[k].variationItemPdvId) {
                        return false;
                    }
                }
            }
        }
    }

    return true;
}
