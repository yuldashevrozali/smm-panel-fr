export type UserRole = "user" | "admin" | "super_admin";

export type User = {
  id: number;
  telegram_id?: number | null;
  google_sub?: string | null;
  email?: string | null;
  username: string | null;
  first_name: string | null;
  role?: UserRole;
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
  user_id?: number | string;
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

export type AdminStats = {
  total_users: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_revenue: number | string;
  total_user_balance: number | string;
};

export type AdminUserList = {
  items: User[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminOrderList = {
  items: Order[];
  total: number;
  limit: number;
  offset: number;
};

export type PaymentMethod = "crypto" | "uzs_card" | "visa" | "admin";
export type PaymentStatus = "pending" | "approved" | "rejected";

export type PaymentRequest = {
  id: number;
  user_id: number;
  amount: number | string;
  currency: string;
  method: string;
  status: PaymentStatus;
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminPayment = PaymentRequest & {
  user_email?: string | null;
  user_name?: string | null;
  reviewer_email?: string | null;
};

export type AdminPaymentList = {
  items: AdminPayment[];
  total: number;
  pending_count: number;
  limit: number;
  offset: number;
};
