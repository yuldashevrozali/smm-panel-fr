export type User = {
  id: number;
  telegram_id?: number | null;
  google_sub?: string | null;
  email?: string | null;
  username: string | null;
  first_name: string | null;
  balance: number;
  created_at?: string;
};

export type TelegramAuthData = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export type GoogleAuthData = {
  credential: string;
};

export type AuthResponse = {
  message: string;
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type Service = {
  service: number | string;
  name: string;
  category: string;
  rate: string | number;
  min: number;
  max: number;
  type?: string | null;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
  description?: string;
};

export type Order = {
  id: number | string;
  external_order_id: string;
  service_id: string | number;
  link: string;
  quantity: number;
  charge: string | number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type OrderPage = {
  items: Order[];
  page: number;
  page_size: number;
  total: number;
};
