export interface PayMethod {
  _id: string;
  description: string;
  code: string;
}

export const PaymentMethods: PayMethod[] = [
  {
    _id: '0',
    code: "DIN",
    description: 'Dinheiro'
  },
  {
    _id: '1',
    code: "CAR",
    description: 'Cartão'
  },
  {
    _id: '2',
    code: "PIX",
    description: 'Pix'
  }
]



export interface PaymentMethod {
  id?: string;
  _id: string;
  description: string;
  isOnline: boolean;
  isLocal: boolean;
  code: string;
  isActive: boolean;
  maxParcels?: number;
  rate?: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}
