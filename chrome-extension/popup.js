const APP_URL = 'http://localhost:3000/chat';

const openButton = document.getElementById('open');
const status = document.getElementById('status');

openButton.addEventListener('click', async () => {
  try {
    status.textContent = '';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      status.textContent = 'Could not read the current tab URL.';
      return;
    }

    const destination = `${APP_URL}?sourceUrl=${encodeURIComponent(tab.url)}`;
    await chrome.tabs.create({ url: destination });
    window.close();
  } catch (error) {
    console.error('Failed to open DailyPost:', error);
    status.textContent = 'Failed to open DailyPost.';
  }
});
