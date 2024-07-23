document.getElementById('save-token').addEventListener('click', () => {
  const token = document.getElementById('gitlab-token').value;
  chrome.storage.sync.set({gitlabToken: token}, () => {
    alert('Token saved successfully!');
  });
});