import { db } from '@/lib/db';
import { users, voiceProfiles } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      name,
      passwordHash,
    }).returning();

    // Create empty voice profile for the user
    await db.insert(voiceProfiles).values({
      userId: newUser.id,
    });

    return NextResponse.json(
      { message: 'User created successfully', userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






