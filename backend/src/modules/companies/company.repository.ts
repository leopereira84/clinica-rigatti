import type { ClientSession } from 'mongoose';
import { CompanyModel, type CompanyDocument } from './company.model.js';

export const companyRepository = {
  create(data: { name: string }, session?: ClientSession): Promise<CompanyDocument> {
    return new CompanyModel(data).save({ session });
  },

  /** `companyId` always comes from the authenticated context, never from the client. */
  findById(companyId: string): Promise<CompanyDocument | null> {
    return CompanyModel.findById(companyId).exec();
  },
};
