import { readFileSync } from 'fs';
import path from 'path';

const WEBFLOW_ROOT = path.join(process.cwd(), 'posties.webflow');

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rewriteAssetPaths(html: string) {
  return html
    .replace(/(src|href)=("|\')images\//g, '$1=$2/webflow-assets/images/')
    .replace(/(src|href)=("|\')js\//g, '$1=$2/webflow-assets/js/')
    .replace(/(src|href)=("|\')css\//g, '$1=$2/webflow-assets/css/')
    .replace(/(srcset=)("|\')([^"\']*)/g, (_match, attr, quote, value: string) => {
      const rewritten = value.replace(/images\//g, '/webflow-assets/images/');
      return `${attr}${quote}${rewritten}`;
    })
    .replace(/href=("|\')index\.html\1/g, 'href="/dashboard"')
    .replace(/href=("|\')voice-settings---step-1\.html\1/g, 'href="/onboarding"')
    .replace(/href=("|\')team\.html\1/g, 'href="#"');
}

export function loadWebflowBody(fileName: string) {
  const html = readFileSync(path.join(WEBFLOW_ROOT, fileName), 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (!bodyMatch) {
    throw new Error(`Could not extract body from ${fileName}`);
  }

  return rewriteAssetPaths(bodyMatch[1]);
}

export function injectDashboardTopics(html: string, topics: string[]) {
  const topicMarkup = topics
    .map(
      (topic) => `
              <a href="#" class="suggested-prompt-pill dashboard-topic-pill w-inline-block" data-topic="${escapeHtml(topic)}">
                <div>${escapeHtml(topic)}</div>
              </a>`
    )
    .join('');

  return html.replace(
    /<div class="topicspills"[^>]*>[\s\S]*?<\/div>\s*<\/div>/,
    `<div class="topicspills">${topicMarkup}
            </div>
          </div>`
  );
}

export function injectDashboardTopicManagementLink(html: string) {
  return html.replace(
    /<a href="#" class="headerlink">Manage<\/a>/,
    '<a href="/onboarding?step=topics" class="headerlink">Manage</a>'
  );
}

export function injectDashboardChatMount(html: string) {
  return html.replace(
    /<div class="chatcolumn">[\s\S]*?<\/div>\s*<div class="postcolumn">/,
    `<div class="chatcolumn"><div id="dashboard-chat-root" style="height:100%"></div></div><div class="postcolumn">`
  );
}

export function injectDashboardPostMount(html: string) {
  return html.replace(
    /<div class="samplecard">[\s\S]*?<\/div>\s*<div class="linedivider">/,
    `<div class="samplecard" id="dashboard-post-root"></div><div class="linedivider">`
  );
}
