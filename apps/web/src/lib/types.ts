export type Role = 'USER' | 'ADMIN';
export type OrderKind = 'NORMAL' | 'HOLD';
export type OrderStatus =
  | 'AWAITING_DEPOSIT' | 'HOLDING' | 'AWAITING_PAYMENT' | 'PAYMENT_REVIEW'
  | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
export type PaymentPurpose = 'DEPOSIT' | 'BALANCE' | 'FULL';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type User = {
  id: string; name?: string | null; phone: string; email?: string | null; role: Role;
  isClubMember?: boolean; smsOptIn?: boolean; birthDate?: string | null; city?: string | null;
  createdAt?: string; hasPassword?: boolean;
};

export type Category = {
  id: string; name: string; slug: string; description?: string; image?: string;
  isActive?: boolean; sortOrder?: number; _count?: { products: number };
};

export type ProductImage = { id?: string; url: string; alt?: string; position?: number };
export type Variant = { id: string; size: string; color: string; colorHex?: string | null; stock: number; sku?: string | null };
export type FestivalTag = { title: string; slug: string; percent: number; endsAt: string } | null;

export type Product = {
  id: string; title: string; slug: string; description: string; shortDescription?: string | null;
  price: number; finalPrice: number; compareAtPrice?: number | null; costPrice?: number;
  categoryId?: string | null; collection?: string | null; material?: string | null; sizeGuide?: string | null;
  isActive: boolean; isFeatured: boolean; viewCount?: number;
  metaTitle?: string | null; metaDescription?: string | null;
  images: ProductImage[]; variants: Variant[];
  category?: { id: string; name: string; slug: string } | null;
  festival: FestivalTag;
  createdAt?: string;
};

export type Festival = {
  id: string; title: string; slug: string; description?: string | null; bannerText?: string | null;
  percent: number; startsAt: string; endsAt: string; isActive?: boolean; allProducts?: boolean;
  categoryIds?: string[]; productIds?: string[]; products?: { id: string; title: string }[];
};

export type Coupon = {
  id: string; code: string; description?: string | null; type: 'PERCENT' | 'FIXED'; value: number;
  maxDiscount?: number | null; minOrder?: number | null; startsAt?: string | null; endsAt?: string | null;
  usageLimit?: number | null; perUserLimit?: number | null; usedCount: number; isActive: boolean; createdAt: string;
};

export type ShippingMethod = {
  id: string; code: string; title: string; description?: string | null; cost: number;
  scope: 'ALL' | 'ONLY' | 'EXCEPT'; province?: string | null; isActive: boolean; sortOrder: number;
};

export type OrderItem = {
  id: string; productId?: string; variantId?: string; title: string; slug?: string; image?: string;
  size?: string; color?: string; basePrice: number; unitPrice: number; unitCost?: number; quantity: number; addedAt: string;
};

export type Payment = {
  id: string; purpose: PaymentPurpose; method: 'CARD' | 'ZARINPAL'; amount: number; status: PaymentStatus;
  imageUrl?: string | null; payerName?: string | null; trackingCode?: string | null; refId?: string | null;
  cardPan?: string | null; adminNote?: string | null; paidAt?: string | null; createdAt: string;
};

export type Order = {
  id: string; orderNumber: string; kind: OrderKind; status: OrderStatus;
  subtotal: number; festivalDiscount: number; couponDiscount: number; shippingCost: number; total: number;
  depositAmount: number; paidAmount: number; holdUntil?: string | null; holdClosedAt?: string | null;
  couponCode?: string | null; shippingCode?: string | null; shippingTitle?: string | null;
  receiverName: string; receiverPhone: string; province: string; city: string; postalCode: string; addressLine: string;
  note?: string | null; trackingNumber?: string | null; adminNote?: string | null;
  items: OrderItem[]; payments: Payment[];
  user?: { id: string; name?: string | null; phone: string };
  due: { purpose: PaymentPurpose | null; amount: number };
  paidAt?: string | null; createdAt: string;
};

export type Address = {
  id: string; receiverName: string; phone: string; province: string; city: string;
  postalCode: string; line: string; isDefault: boolean;
};

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number; pages: number };
export type Settings = Record<string, string>;
