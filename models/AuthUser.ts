import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";

const { model, models, Schema } = mongoose;

export const AUTH_USER_COLLECTION = "authusers";

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

export const AUTH_USER_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["email", "passwordHash", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      email: {
        bsonType: "string",
        minLength: 3,
        maxLength: 320,
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      },
      passwordHash: { bsonType: "string", minLength: 60, maxLength: 255 },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
};

export type AuthUser = InferSchemaType<typeof authUserSchema>;

export type AppOwner = {
  id: string;
  email: string;
  createdAt: string;
};

export const AuthUserModel: Model<AuthUser> =
  (models.AuthUser as Model<AuthUser>) ||
  model<AuthUser>("AuthUser", authUserSchema);

export function serializeAppOwner(user: {
  _id: Types.ObjectId;
  email: string;
  createdAt: Date;
}): AppOwner {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
