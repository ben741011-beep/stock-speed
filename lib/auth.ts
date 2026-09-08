import "server-only";

import { cache } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import { readSession } from "@/lib/session";
import { AuthUserModel, serializeAuthUser } from "@/models/AuthUser";

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;

  await connectToDatabase();
  const user = await AuthUserModel.findById(session.userId)
    .select("_id email createdAt")
    .lean();

  return user ? serializeAuthUser(user) : null;
});
