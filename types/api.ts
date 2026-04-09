// ── Base entity ───────────────────────────────────────────────────────────────
export type BaseEntity = {
  id: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};

/**
 * Merges a domain-specific shape with the common audit fields.
 *
 * Example:
 *   type CategoryEntity = { name: string };
 *   type Category = Entity<CategoryEntity>;
 */
export type Entity<T> = {
  [K in keyof T]: T[K];
} & BaseEntity;

export type ProductEntity = {
  name: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  type: "inventory" | "non-inventory";
  isActive: boolean;
  imageUrl: string;
  variation: string;
  categoryName: string;
  categoryId: string;
  baseProductId: string;
  baseName: string;
  variantId: string;
  stockQuantity?: number;
};

export type ProductDetailEntity = ProductEntity & {
  description: string | null;
  stock: {
    storeId: string;
    storeName: string;
    storeCode: string;
    quantity: number;
  }[];
};

export type Product = Entity<ProductEntity>;
export type ProductDetail = Entity<ProductDetailEntity>;

export type ScanAckData = {
  received: boolean;
  mode: "regular" | "add-to-cart";
  barcode: string;
  product: ProductDetail | null;
  error: string | null;
};
