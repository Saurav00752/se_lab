import { eq, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { UserAccount, UserRole } from '../types.ts';

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: UserAccount;
  effectiveRole?: UserRole;
  effectiveStudentId?: string | null;
}

export async function getOrCreateUserFromToken(
  decoded: DecodedIdToken
): Promise<UserAccount> {
  try {
    const uid = decoded.uid;
    const email = decoded.email || `${uid}@beacon.edu`;
    const displayName =
      (decoded.name as string | undefined) || email.split('@')[0] || 'Beacon User';
    const avatarUrl = (decoded.picture as string | undefined) || null;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          email,
          name: existing[0].name || displayName,
          avatarUrl: avatarUrl ?? existing[0].avatarUrl,
        })
        .where(eq(users.uid, uid))
        .returning();

      return {
        id: updated.id,
        uid: updated.uid,
        name: updated.name,
        email: updated.email,
        role: updated.role as UserRole,
        title: updated.title,
        linked_student_id: updated.linkedStudentId,
        avatar_url: updated.avatarUrl,
        active: updated.active,
        created_at: updated.createdAt.toISOString(),
      };
    }

    // Check if any admin exists yet; the very first authenticated user becomes admin
    const adminCountRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'admin'));

    const isFirstAdmin = (adminCountRes[0]?.count ?? 0) === 0;
    const assignedRole: UserRole = isFirstAdmin ? 'admin' : 'student';
    const assignedTitle = isFirstAdmin
      ? 'Dean of Academic Success'
      : 'Undergraduate Student';
    const linkedStudentId = isFirstAdmin ? null : 'STU-1042';

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email,
        name: displayName,
        role: assignedRole,
        title: assignedTitle,
        linkedStudentId,
        avatarUrl,
        active: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    return {
      id: created.id,
      uid: created.uid,
      name: created.name,
      email: created.email,
      role: created.role as UserRole,
      title: created.title,
      linked_student_id: created.linkedStudentId,
      avatar_url: created.avatarUrl,
      active: created.active,
      created_at: created.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('Database user sync failed:', error);
    throw new Error('Failed to synchronize authenticated user profile.', {
      cause: error,
    });
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    const dbUser = await getOrCreateUserFromToken(decodedToken);
    if (!dbUser.active) {
      res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
      return;
    }

    req.dbUser = dbUser;

    // Allow verified Admins to preview Counselor or Student views cleanly
    const previewRole = req.header('x-preview-role') as UserRole | undefined;
    const previewStudentId = req.header('x-preview-student-id');
    if (
      dbUser.role === 'admin' &&
      previewRole &&
      ['admin', 'counselor', 'student'].includes(previewRole)
    ) {
      req.effectiveRole = previewRole;
      req.effectiveStudentId =
        previewRole === 'student'
          ? previewStudentId || 'STU-1042'
          : dbUser.linked_student_id;
    } else {
      req.effectiveRole = dbUser.role;
      req.effectiveStudentId = dbUser.linked_student_id;
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export function requireRole(...allowed: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.effectiveRole;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({
        error: `Access denied for role '${role ?? 'unknown'}'. Required: ${allowed.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
