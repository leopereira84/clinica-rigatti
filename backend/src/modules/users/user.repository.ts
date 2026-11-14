import type { ClientSession, Types } from 'mongoose';
import type { Role } from '../../shared/auth/roles.js';
import { UserModel, type UserDocument } from './user.model.js';

export interface NewUser {
  companyId: Types.ObjectId | string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export const userRepository = {
  /** Tenant-scoped lookup: a user from another company is simply not found. */
  findById(companyId: string, userId: string): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: userId, companyId }).exec();
  },

  findAllByCompany(companyId: string): Promise<UserDocument[]> {
    return UserModel.find({ companyId }).sort({ createdAt: 1 }).exec();
  },

  create(data: NewUser, session?: ClientSession): Promise<UserDocument> {
    return new UserModel(data).save({ session });
  },

  async existsByEmail(email: string): Promise<boolean> {
    return (await UserModel.exists({ email })) !== null;
  },

  // --- Authentication-only lookups -------------------------------------------
  // These are the only unscoped queries on tenant data. They run before a
  // tenant context exists (login) or to build it (token validation), and are
  // used exclusively by the auth module.

  /** Login: includes the password hash. */
  findByEmailForLogin(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email }).select('+passwordHash').exec();
  },

  /** Token validation: the caller must check the user's companyId against the token. */
  findByIdForAuthentication(userId: string): Promise<UserDocument | null> {
    return UserModel.findById(userId).exec();
  },
};
