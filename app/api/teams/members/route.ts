import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/teams/members
 * Remove a member from a team (or leave the team yourself).
 * Owners/admins can remove anyone. Members can only remove themselves.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { teamId, userId: targetUserId } = (await req.json()) as {
    teamId?: string;
    userId?: string;
  };

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  const targetId = targetUserId || session.user.id;

  // Get the requester's membership
  const requesterMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, session.user.id),
    ),
  });

  if (!requesterMembership) {
    return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
  }

  // If removing someone else, must be owner or admin
  if (targetId !== session.user.id) {
    if (requesterMembership.role !== 'owner' && requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }
  }

  // Owners can't remove themselves (must delete team instead)
  if (targetId === session.user.id && requesterMembership.role === 'owner') {
    return NextResponse.json({ error: 'Team owner cannot leave. Delete the team instead.' }, { status: 400 });
  }

  await db.delete(teamMembers).where(
    and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, targetId),
    ),
  );

  return NextResponse.json({ success: true });
}
