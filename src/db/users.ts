import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName,
        photoUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? undefined,
          photoUrl: photoUrl ?? undefined,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to synchronize user record", { cause: error });
  }
}
