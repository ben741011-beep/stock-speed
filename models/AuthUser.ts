import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";

const { model, models, Schema } = mongoose;

export const AUTH_USER_COLLECTION = "authusers";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authUserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 60,
      maxlength: 255,
      select: false,
    },
  },
  { timestamps: true, collection: AUTH_USER_COLLECTION },
);

authUserSchema.index({ email: 1 }, { unique: true, name: "email_1" });

export type AuthUser = InferSchemaType<typeof authUserSchema>;

export type AuthCredentials = {
  email: string;
  password: string;
};

export type PublicAuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export const AuthUserModel: Model<AuthUser> =
  (models.AuthUser as Model<AuthUser>) ||
  model<AuthUser>("AuthUser", authUserSchema);

export function parseAuthCredentials(input: unknown):
  | { success: true; data: AuthCredentials }
  | { success: false; error: string } {
  if (!input || typeof input !== "object") {
    return { success: false, error: "請提供 email 與密碼。" };
  }

  const record = input as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const password = typeof record.password === "string" ? record.password : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { success: false, error: "請輸入有效的 email。" };
  }

  if (password.length < 8) {
    return { success: false, error: "密碼至少需要 8 個字元。" };
  }

  if (new TextEncoder().encode(password).length > 72) {
    return { success: false, error: "密碼不可超過 72 bytes。" };
  }

  return { success: true, data: { email, password } };
}

export function serializeAuthUser(user: {
  _id: Types.ObjectId;
  email: string;
  createdAt: Date;
}): PublicAuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
