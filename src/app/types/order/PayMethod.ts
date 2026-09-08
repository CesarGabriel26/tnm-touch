export interface PaymentMethod {
  id?: string;
  description: string;
  isOnline?: boolean;
  isLocal?: boolean;
  code?: string;
  isActive?: boolean;
  maxParcels?: number;
  rate?: number;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}
