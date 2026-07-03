// ─── Enums ───────────────────────────────────────────────────────────────────

export type ProductType = 'CAR' | 'PART';

export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' | 'CNG';

export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'DCT';

export type BodyType =
  | 'SEDAN'
  | 'SUV'
  | 'HATCHBACK'
  | 'PICKUP'
  | 'COUPE'
  | 'WAGON'
  | 'VAN'
  | 'MPV';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'SSLCOMMERZ'
  | 'BKASH'
  | 'NAGAD'
  | 'STRIPE'
  | 'COD';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ServiceType =
  | 'CHECKUP'
  | 'OIL_CHANGE'
  | 'REPAIR'
  | 'PART_INSTALLATION'
  | 'TIRE_SERVICE'
  | 'AC_SERVICE'
  | 'BODY_WORK';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ChatSenderType = 'CUSTOMER' | 'AGENT' | 'SYSTEM';

export type Locale = 'en' | 'bn';

// ─── API response wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  heroVideoUrl: string | null;
  description: string | null;
  descriptionBn: string | null;
}

export interface CarModelDto {
  id: string;
  brandId: string;
  brand?: BrandDto;
  name: string;
  slug: string;
  yearFrom: number;
  yearTo: number | null;
  bodyType: BodyType;
  heroImageUrl: string | null;
  videoUrl: string | null;
  model3dUrl: string | null;
  basePrice: number;
  description: string | null;
  descriptionBn: string | null;
}

export interface CarVariantDto {
  id: string;
  modelId: string;
  trim: string;
  engine: string;
  transmission: TransmissionType;
  fuelType: FuelType;
  color: string;
  colorHex: string | null;
  price: number;
  stock: number;
  sku: string;
}

export interface PartCategoryDto {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface PartDto {
  id: string;
  categoryId: string;
  category?: PartCategoryDto;
  name: string;
  slug: string;
  partNumber: string;
  price: number;
  stock: number;
  description: string | null;
  descriptionBn: string | null;
  images: string[];
  compatibleBrands: string[];
  compatibleModels: string[];
  compatibleYearFrom: number | null;
  compatibleYearTo: number | null;
}

export interface ProductDto {
  id: string;
  type: ProductType;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string;
  images: string[];
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  carModelId: string | null;
  carVariantId: string | null;
  partId: string | null;
  carModel?: CarModelDto;
  carVariant?: CarVariantDto;
  part?: PartDto;
}

// ─── Cart & Orders ───────────────────────────────────────────────────────────

export interface CartItemDto {
  productId: string;
  quantity: number;
  product?: ProductDto;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  itemCount: number;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  items: OrderItemDto[];
  createdAt: string;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface ServiceCenterDto {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  lat: number | null;
  lng: number | null;
}

export interface AppointmentDto {
  id: string;
  serviceType: ServiceType;
  carBrand: string;
  carModel: string;
  carYear: number | null;
  issueDescription: string | null;
  preferredDate: string;
  preferredTime: string;
  status: AppointmentStatus;
  serviceCenter: ServiceCenterDto;
  createdAt: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessageDto {
  id: string;
  sessionId: string;
  senderType: ChatSenderType;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ChatSessionDto {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  isActive: boolean;
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
  createdAt: string;
}

// ─── Permissions (RBAC) ──────────────────────────────────────────────────────

export const PERMISSIONS = {
  PRODUCT_MANAGE: 'product.manage',
  ORDER_MANAGE: 'order.manage',
  APPOINTMENT_MANAGE: 'appointment.manage',
  CHAT_RESPOND: 'chat.respond',
  SUPPORT_MANAGE: 'support.manage',
  USER_MANAGE: 'user.manage',
  ANALYTICS_VIEW: 'analytics.view',
  ADMIN_FULL: 'admin.full',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
