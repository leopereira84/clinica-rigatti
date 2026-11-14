import { type HydratedDocument, type InferSchemaType, model, Schema } from 'mongoose';

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true },
);

export type Company = InferSchemaType<typeof companySchema>;
export type CompanyDocument = HydratedDocument<Company>;

export const CompanyModel = model('Company', companySchema);

export interface PublicCompany {
  id: string;
  name: string;
}

export function toPublicCompany(company: CompanyDocument): PublicCompany {
  return { id: company._id.toString(), name: company.name };
}
