import mongoose from 'mongoose';
import type { AuthContext } from '../../shared/auth/authContext.js';
import { signAccessToken } from '../../shared/auth/jwt.js';
import { hashPassword, verifyPassword } from '../../shared/auth/password.js';
import { isDuplicateKeyError } from '../../shared/database/errors.js';
import { AppError } from '../../shared/errors/AppError.js';
import { type CompanyDocument, type PublicCompany, toPublicCompany } from '../companies/company.model.js';
import { companyRepository } from '../companies/company.repository.js';
import { emailInUseError } from '../users/user.errors.js';
import { type PublicUser, toPublicUser, type UserDocument } from '../users/user.model.js';
import { userRepository } from '../users/user.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export interface AuthProfile {
  user: PublicUser;
  company: PublicCompany;
}

export interface AuthResult extends AuthProfile {
  token: string;
}

function invalidCredentials(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
}

function buildAuthResult(user: UserDocument, company: CompanyDocument): AuthResult {
  return {
    token: signAccessToken({ userId: user._id.toString(), companyId: company._id.toString() }),
    user: toPublicUser(user),
    company: toPublicCompany(company),
  };
}

async function register(input: RegisterInput): Promise<AuthResult> {
  if (await userRepository.existsByEmail(input.email)) {
    throw emailInUseError();
  }

  // Hash outside the transaction to keep it short.
  const passwordHash = await hashPassword(input.password);

  try {
    // Company and admin are created atomically: no orphan company if the user
    // insert fails. Requires a replica set (Atlas, or MongoMemoryReplSet in tests).
    const { company, user } = await mongoose.connection.transaction(async (session) => {
      const company = await companyRepository.create({ name: input.companyName }, session);
      const user = await userRepository.create(
        {
          companyId: company._id,
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'admin', // fixed: signup always creates the admin of a NEW company
        },
        session,
      );
      return { company, user };
    });

    return buildAuthResult(user, company);
  } catch (error) {
    // Two concurrent signups with the same email: the unique index decides.
    if (isDuplicateKeyError(error)) throw emailInUseError();
    throw error;
  }
}

async function login(input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByEmailForLogin(input.email);
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash);

  if (!user || !passwordMatches) {
    throw invalidCredentials();
  }

  const company = await companyRepository.findById(user.companyId.toString());
  if (!company) {
    throw new Error(`Data integrity: user ${user._id.toString()} references a missing company`);
  }

  return buildAuthResult(user, company);
}

async function getProfile(auth: AuthContext): Promise<AuthProfile> {
  const [user, company] = await Promise.all([
    userRepository.findById(auth.companyId, auth.userId),
    companyRepository.findById(auth.companyId),
  ]);

  // `authenticate` already validated both; this only guards against a
  // deletion between the middleware and this query.
  if (!user || !company) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }

  return { user: toPublicUser(user), company: toPublicCompany(company) };
}

export const authService = { register, login, getProfile };
