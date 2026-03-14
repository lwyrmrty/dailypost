import { auth } from '@/auth';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import {
  loadWebflowBody,
  injectDashboardChatMount,
  injectDashboardPostMount,
  injectDashboardTopicManagementLink,
  injectDashboardTopics,
} from '@/lib/webflow/load-body';
import { sanitizeTopicLabels } from '@/lib/topics';
import { eq } from 'drizzle-orm';
import DashboardStaticShell from './components/DashboardStaticShell';

const DEFAULT_TOPICS = [
  'Fundraising',
  'Deep Tech',
  'VC',
  'Defense Spending',
  'AI Agents',
  'Fund Operations',
  'Geopolitics',
];

export default async function DashboardPage() {
  const session = await auth();
  const html = loadWebflowBody('index.html');

  if (!session?.user?.id) {
    return <DashboardStaticShell html={html} userId={null} userFirstName={null} />;
  }

  const userFirstName = session.user.name?.split(/\s+/)[0] ?? null;

  const profile = await db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.userId, session.user.id),
    columns: {
      primaryTopics: true,
    },
  });

  const topics = sanitizeTopicLabels(profile?.primaryTopics?.filter(Boolean).slice(0, 12) || DEFAULT_TOPICS);
  const hydratedHtml = injectDashboardPostMount(
    injectDashboardChatMount(
      injectDashboardTopicManagementLink(injectDashboardTopics(html, topics))
    )
  );

  return <DashboardStaticShell html={hydratedHtml} userId={session.user.id} userFirstName={userFirstName} />;
}
