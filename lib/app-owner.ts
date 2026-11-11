import "server-only";

import { cache } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthUserModel, serializeAppOwner } from "@/models/AuthUser";

export const getAppOwner = cache(async () => {
  await connectToDatabase();

  const users = await AuthUserModel.find({})
    .select("_id email createdAt")
    .sort({ _id: 1 })
    .limit(2)
    .lean();

  if (users.length !== 1) {
    throw new Error(`單一使用者模式需要恰好一位使用者，目前找到 ${users.length} 位。`);
  }

  return serializeAppOwner(users[0]);
});
