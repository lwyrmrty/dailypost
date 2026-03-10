import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { teams, teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/teams/join
 * Join a team using an invite code.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inviteCode } = (await req.json()) as { inviteCode?: string };
  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.inviteCode, inviteCode.trim()),
  });

  if (!team) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Check if already a member
  const existing = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, session.user.id),
    ),
  });

  if (existing) {
    return NextResponse.json({ error: 'Already a member of this team' }, { status: 409 });
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: session.user.id,
    role: 'member',
  });

  return NextResponse.json({ team: { id: team.id, name: team.name } });
}
