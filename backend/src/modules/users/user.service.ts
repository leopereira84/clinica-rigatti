import type { AuthContext } from '../../shared/auth/authContext.js';
import { hashPassword } from '../../shared/auth/password.js';
import { isDuplicateKeyError } from '../../shared/database/errors.js';
import { emailInUseError } from './user.errors.js';
import { type PublicUser, toPublicUser } from './user.model.js';
import { userRepository } from './user.repository.js';
import type { CreateUserInput } from './user.schemas.js';

async function list(auth: AuthContext): Promise<PublicUser[]> {
  const users = await userRepository.findAllByCompany(auth.companyId);
  return users.map(toPublicUser);
}

/** Controlled onboarding: an admin adds a member to their own company. */
async function create(auth: AuthContext, input: CreateUserInput): Promise<PublicUser> {
  if (await userRepository.existsByEmail(input.email)) {
    throw emailInUseError();
  }

  try {
    const user = await userRepository.create({
      companyId: auth.companyId,
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'user',
    });
    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw emailInUseError();
    throw error;
  }
}

export const userService = { list, create };
