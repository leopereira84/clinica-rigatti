import { type HydratedDocument, type InferSchemaType, model, Schema } from 'mongoose';

const productSchema = new Schema(
  {
    // Tenant boundary. Always set from the authenticated context, never from input.
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    // Integer amount in cents, avoiding floating-point rounding issues.
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    imageUrl: { type: String, trim: true, maxlength: 2048 },
    sku: { type: String, trim: true, maxlength: 64 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Every index starts with companyId: all queries are tenant-scoped.
productSchema.index({ companyId: 1, createdAt: -1 });
productSchema.index({ companyId: 1, name: 1 });
productSchema.index({ companyId: 1, price: 1 });
productSchema.index({ companyId: 1, category: 1 });
// SKU is optional, but unique within a company when present.
productSchema.index(
  { companyId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product>;

export const ProductModel = model('Product', productSchema);

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  sku: string | null;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Explicit allow-list: tenant and audit fields (companyId, createdBy) are not exposed. */
export function toPublicProduct(product: ProductDocument): PublicProduct {
  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl ?? null,
    sku: product.sku ?? null,
    stock: product.stock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
