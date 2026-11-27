import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDatabase = globalThis as typeof globalThis & { openAssetDb?: PrismaClient };

export function createDatabase(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function database() {
  if (!globalDatabase.openAssetDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Set DATABASE_URL before starting OpenAsset.");
    globalDatabase.openAssetDb = createDatabase(url);
  }
  return globalDatabase.openAssetDb;
}
