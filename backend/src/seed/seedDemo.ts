import mongoose from 'mongoose';
import { hashPassword } from '../shared/auth/password.js';
import { CompanyModel } from '../modules/companies/company.model.js';
import { ProductModel } from '../modules/products/product.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { DEMO_COMPANIES } from './demoData.js';

export interface SeedSummary {
  removedCompanies: number;
  companies: { name: string; users: { email: string; role: string }[]; products: number }[];
}

/**
 * Recreates the demo companies in a single transaction.
 *
 * Maintenance code that works across tenants by design, so it uses the models
 * directly instead of the tenant-scoped repositories. It only touches
 * companies that own one of the demo emails; nothing else is read or removed.
 */
export async function seedDemoData(password: string): Promise<SeedSummary> {
  const passwordHash = await hashPassword(password);
  const demoEmails = DEMO_COMPANIES.flatMap((company) => company.users.map((user) => user.email));

  return mongoose.connection.transaction(async (session) => {
    // `trusted` marks server-built operators so sanitizeFilter keeps them.
    const existingUsers = await UserModel.find({ email: mongoose.trusted({ $in: demoEmails }) }).session(session);
    const staleCompanyIds = [...new Set(existingUsers.map((user) => user.companyId.toString()))];

    if (staleCompanyIds.length > 0) {
      const inStale = mongoose.trusted({ $in: staleCompanyIds });
      await ProductModel.deleteMany({ companyId: inStale }, { session });
      await UserModel.deleteMany({ companyId: inStale }, { session });
      await CompanyModel.deleteMany({ _id: inStale }, { session });
    }

    const summary: SeedSummary = { removedCompanies: staleCompanyIds.length, companies: [] };

    for (const demo of DEMO_COMPANIES) {
      const company = await new CompanyModel({ name: demo.name }).save({ session });

      const users = await UserModel.insertMany(
        demo.users.map((user) => ({ ...user, companyId: company._id, passwordHash })),
        { session },
      );
      const admin = users.find((user) => user.role === 'admin');
      if (!admin) throw new Error(`Demo company "${demo.name}" has no admin`);

      await ProductModel.insertMany(
        demo.products.map((product) => ({ ...product, companyId: company._id, createdBy: admin._id })),
        { session },
      );

      summary.companies.push({
        name: demo.name,
        users: demo.users.map(({ email, role }) => ({ email, role })),
        products: demo.products.length,
      });
    }

    return summary;
  });
}
