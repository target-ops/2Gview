console.log('GitLab Pipeline Viewer background script loaded');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'fetchPipelines') {
    console.log('Fetching pipelines...');
    chrome.storage.sync.get(['gitlabToken'], (result) => {
      if (result.gitlabToken) {
        verifyGitLabAccess(result.gitlabToken).then(isValid => {
          if (isValid) {
            createPipelineContainer();
            fetchPipelines();
          } else {
            showError('Invalid GitLab token or insufficient permissions. Please check your token in the extension options.');
          }
        });
      } else {
        showError('GitLab token not set. Please set it in the extension options.');
      }
    });
  }
});
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.storage.sync.get(['gitlabToken'], (result) => {
    console.log('Checking for existing GitLab token:', result.gitlabToken ? 'Token exists' : 'No token');
    if (!result.gitlabToken) {
      chrome.runtime.openOptionsPage();
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, changeInfo.status, tab.url);
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('gitlab.com')) {
    console.log('Sending message to content script');
    chrome.tabs.sendMessage(tabId, { action: 'fetchPipelines' });
  }
});

console.log('GitLab Pipeline Viewer background script fully loaded');