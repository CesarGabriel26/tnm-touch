/**
 * @file OrderItemData.ts
 * @description Interface pública para trabalhar com dados de OrderItem sem depender da classe
 * 
 * Esta interface substitui o uso direto da classe OrderItem em componentes e providers.
 * Use esta interface quando precisar:
 * - Adicionar itens ao carrinho (ShoppingBag)
 * - Exportar/Importar dados de OrderItem
 * - Armazenar dados no localStorage
 * - Passar dados entre componentes
 */

import type { OrderItemComplementType, OrderItemDataType } from './orderItem';
import type { ProductType } from './catalogItem';

/**
 * Interface que representa os dados de um item de pedido
 * Esta é a interface pública recomendada para uso em toda a aplicação
 */
export interface OrderItemData {
  /** Tipo do produto (NORMAL, PIZZA, VARIATION, etc.) */
  itemType?: ProductType;
  
  /** Lista de produtos/sabores adicionados ao item */
  data: Array<OrderItemDataType>;
  
  /** Lista de complementos selecionados */
  complements: Array<OrderItemComplementType>;
  
  /** Variação selecionada (tamanho, por exemplo) */
  variation: {
    pdvId: string;
    variationItemPdvId: string;
    name: string;
    qtdSelection: number;
    qtdSelectionChargeHigher: number;
  } | null;
  
  /** Quantidade do item */
  quantity: number;
  
  /** Preço unitário calculado */
  price: number;
  
  /** Preço total (price * quantity) */
  total: number;
}

/**
 * Exemplo de uso:
 * 
 * ```typescript
 * // No componente que usa OrderItemProvider
 * const orderItem = useOrderItem();
 * 
 * // Adicionar dados
 * orderItem.addData(productData);
 * orderItem.setVariation(variation);
 * orderItem.addComplement(complement);
 * 
 * // Exportar para adicionar ao carrinho
 * const orderItemData: OrderItemData = orderItem.exportData();
 * addShoppingBagItem(orderItemData, company);
 * 
 * // Importar dados existentes (para edição)
 * const existingData: OrderItemData = getFromLocalStorage();
 * orderItem.importData(existingData);
 * ```
 */
