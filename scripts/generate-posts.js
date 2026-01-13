#!/usr/bin/env node

/**
 * Daily post generation script
 * This script triggers the post generation API endpoint
 * Run via cron: 0 23 * * * node /path/to/scripts/generate-posts.js
 */

async function generatePosts() {
  console.log('Starting daily post generation...');
  console.log('Time:', new Date().toISOString());
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    process.exit(1);
  }

  try {
    const response = await fetch(`${appUrl}/api/generate-posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Generation failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('Post generation complete!');
    console.log(`Processed users: ${result.processedUsers}`);
    console.log(`Total posts generated: ${result.totalPosts}`);
    
    if (result.results) {
      result.results.forEach(r => {
        if (r.error) {
          console.log(`  User ${r.userId}: ${r.error}`);
        } else {
          console.log(`  User ${r.userId}: ${r.postsGenerated} posts`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Generation failed:', error.message);
    process.exit(1);
  }
}

generatePosts();






