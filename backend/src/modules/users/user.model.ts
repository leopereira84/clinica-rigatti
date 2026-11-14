import { type HydratedDocument, type InferSchemaType, model, Schema } from 'mongoose';
import { ROLES, type Role } from '../../shared/auth/roles.js';

const userSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Globally unique: each user belongs to exactly one company, so login
    // does not need to ask which company the user belongs to.
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    // Never returned by queries unless explicitly requested with `+passwordHash`.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  createdAt: Date;
}

/** Explicit allow-list of fields sent to clients (never the password hash). */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId.toString(),
    createdAt: user.createdAt,
  };
}
