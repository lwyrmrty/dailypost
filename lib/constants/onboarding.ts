export const TOPIC_OPTIONS = [
  'AI',
  'Biotech',
  'Climate',
  'Cybersecurity',
  'Fintech',
  'Healthcare',
  'SaaS',
  'Product',
  'Sales',
  'Marketing',
  'Leadership',
  'Hiring',
  'Startups',
  'Company Building',
  'VC Investing',
  'Operations',
  'Industry Trends',
  'Innovation',
  'Strategy',
  'Growth',
  'Customer Success',
  'Entrepreneurship',
];

export const POSTING_GOALS = [
  { id: 'thought_leadership', label: 'Thought Leadership', description: 'Share clear, credible ideas that position you as a trusted voice in your field.' },
  { id: 'network_building', label: 'Network Building', description: 'Create posts that spark conversations and help you build stronger professional relationships.' },
  { id: 'attract_clients_customers', label: 'Attract Clients / Customers', description: 'Show the value of what you do so the right buyers want to work with you.' },
  { id: 'educate_network', label: 'Educate my Network', description: 'Teach your audience something useful so they leave your content smarter than they came in.' },
  { id: 'brand_awareness', label: 'Brand Awareness', description: 'Increase visibility so more people recognize you, your company, or what you stand for.' },
  { id: 'recruiting', label: 'Recruiting', description: 'Attract talented people by showing how your team thinks, works, and wins.' },
];

export const POST_TYPES = [
  {
    type: 'hot_take',
    name: 'Hot Take',
    example: "Everyone's excited about [X], but they're missing the real story...",
    description: 'Contrarian or provocative take that challenges conventional wisdom',
  },
  {
    type: 'data_analysis',
    name: 'Data Analysis',
    example: 'New data shows deep tech funding is up 47% YoY...',
    description: 'Numbers-driven insights backed by research or data',
  },
  {
    type: 'founder_advice',
    name: 'Founder Advice',
    example: 'Three lessons from our portfolio on building hard tech companies...',
    description: 'Practical wisdom and lessons for builders',
  },
  {
    type: 'news_commentary',
    name: 'News Commentary',
    example: 'Major development: [Company] just closed $200M to scale fusion tech...',
    description: 'React to and provide context on breaking news',
  },
  {
    type: 'poll',
    name: 'Poll / Question',
    example: "What's the biggest challenge facing climate tech startups? [Poll options]",
    description: 'Engage your audience with questions',
  },
  {
    type: 'personal_story',
    name: 'Personal Story',
    example: 'Five years ago I made a bet that seemed crazy...',
    description: 'Behind-the-scenes narrative and personal experiences',
  },
  {
    type: 'curated_list',
    name: 'Curated List',
    example: '10 deep tech startups to watch in 2025...',
    description: 'Resource compilation and listicles',
  },
  {
    type: 'share_with_context',
    name: 'Share with Context',
    example: '[Article link] This piece nails why hard tech is different...',
    description: 'Amplify others content with your perspective',
  },
];

export const TONE_EXAMPLES = {
  professional: {
    name: 'Professional',
    example: "The recent $500M Series C for [Company] represents a significant milestone in the deep tech sector. This investment signals continued institutional confidence in frontier technology platforms.",
    description: 'Formal, authoritative, industry-appropriate',
  },
  conversational: {
    name: 'Conversational',
    example: "So [Company] just raised $500M. Here's why this matters more than you think... (and what most people are missing)",
    description: 'Friendly, approachable, like talking to a colleague',
  },
  provocative: {
    name: 'Provocative',
    example: "Everyone's celebrating [Company]'s $500M raise. I think they're solving the wrong problem. Here's why:",
    description: 'Bold, challenges assumptions, sparks debate',
  },
  educational: {
    name: 'Educational',
    example: "Let's break down what [Company]'s $500M raise tells us about the deep tech market. Thread on market dynamics 🧵",
    description: 'Teaching mode, explains concepts clearly',
  },
  witty: {
    name: 'Witty',
    example: "[Company] raised $500M to commercialize fusion. Scientists have been 10 years away since 1950. But this time feels different 🤷",
    description: 'Clever, humorous undertones, memorable',
  },
};

export const SAMPLE_STORIES = [
  {
    title: "AI Startup Raises $100M Series B",
    summary: "Foundation model company secures major funding from top VCs to expand enterprise AI capabilities",
    topic: "Artificial Intelligence",
  },
  {
    title: "Breakthrough in Quantum Error Correction",
    summary: "Research team achieves new milestone that could accelerate practical quantum computing timeline",
    topic: "Quantum Computing",
  },
  {
    title: "Climate Tech Company Hits Commercial Scale",
    summary: "Carbon capture startup begins commercial operations, signaling maturation of the sector",
    topic: "Climate Tech & Clean Energy",
  },
];
