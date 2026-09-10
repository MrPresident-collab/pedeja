export type ID = string;

export type Timestamp = string;

export type Currency = 'AOA';

export type Category = 'comida' | 'compras' | 'lojas' | 'enviar';

export type PaymentMethod = 'cash' | 'multicaixa' | 'future';

export type ParcelSize = 'pequeno' | 'medio' | 'grande';

export type VehicleType = 'mota' | 'carro' | 'van';

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type Money = {
  amount: number;
  currency: Currency;
};