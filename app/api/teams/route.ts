import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { teams, teamMembers, users, linkedinAccounts, voiceProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * GET /api/teams
 * List all teams the current user belongs to, with members.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, session.user.id),
  });

  if (memberships.length === 0) {
    return NextResponse.json({ teams: [] });
  }

  const teamIds = memberships.map((m) => m.teamId);
  const result = [];

  for (const teamId of teamIds) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    if (!team) continue;

    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
    });

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
        });
        const linkedin = await db.query.linkedinAccounts.findFirst({
          where: eq(linkedinAccounts.userId, m.userId),
        });
        const voice = await db.query.voiceProfiles.findFirst({
          where: eq(voiceProfiles.userId, m.userId),
        });
        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          name: user?.name || user?.email || 'Unknown',
          image: user?.image || null,
          linkedinConnected: !!linkedin,
          hasVoiceProfile: !!voice?.styleBible || !!voice?.voiceAnalysis,
        };
      })
    );

    const myMembership = memberships.find((m) => m.teamId === teamId);

    result.push({
      ...team,
      myRole: myMembership?.role,
      members: memberDetails,
    });
  }

  return NextResponse.json({ teams: result });
}

/**
 * POST /api/teams
 * Create a new team. The creator becomes the owner.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body as { name?: string };

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const inviteCode = randomBytes(4).toString('hex'); // 8-char hex code

  const [team] = await db.insert(teams)
    .values({
      name: name.trim(),
      createdBy: session.user.id,
      inviteCode,
    })
    .returning();

  // Add creator as owner
  await db.insert(teamMembers)
    .values({
      teamId: team.id,
      userId: session.user.id,
      role: 'owner',
    });

  return NextResponse.json({ team }, { status: 201 });
}

/**
 * DELETE /api/teams
 * Delete a team. Only the owner can delete.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { teamId } = (await req.json()) as { teamId?: string };
  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  // Verify ownership
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, session.user.id),
    ),
  });

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the team owner can delete the team' }, { status: 403 });
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  return NextResponse.json({ success: true });
}
