import { extractResearchQuery, looksLikeBroadResearchRequest } from '@/lib/news/research';

interface Fixture {
  message: string;
  shouldResearch: boolean;
  expectedQuery?: string;
}

const fixtures: Fixture[] = [
  {
    message: 'Write me a post about the current state of AI adoption',
    shouldResearch: true,
    expectedQuery: 'the current state of AI adoption',
  },
  {
    message: 'Help me write a post on why deep tech startups are harder to commercialize',
    shouldResearch: true,
    expectedQuery: 'why deep tech startups are harder to commercialize',
  },
  {
    message: 'Make option 2 shorter',
    shouldResearch: false,
  },
  {
    message: 'Write an X thread about AI adoption',
    shouldResearch: false,
  },
  {
    message: 'https://techcrunch.com/example story, write me a post about this',
    shouldResearch: false,
  },
];

function main() {
  let failures = 0;

  for (const fixture of fixtures) {
    const shouldResearch = looksLikeBroadResearchRequest(fixture.message);
    const extractedQuery = extractResearchQuery(fixture.message);
    const queryOk = fixture.expectedQuery ? extractedQuery === fixture.expectedQuery : true;
    const pass = shouldResearch === fixture.shouldResearch && queryOk;

    if (!pass) {
      failures += 1;
    }

    console.log(`${pass ? 'PASS' : 'FAIL'} ${fixture.message}`);
    console.log(`  shouldResearch=${shouldResearch}`);
    console.log(`  extractedQuery=${extractedQuery}`);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main();
