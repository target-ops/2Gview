console.log('Pipeline Viewer content script loaded');

function getRepoNameFromUrl() {
  const path = window.location.pathname.split('/').filter(Boolean);
  if (path.length >= 2) {
    return `${path[0]}/${path[1]}`;
  }
  return null;
}
function getRepoPathFromUrl() {
  const path = window.location.pathname.split('/').filter(Boolean);
  if (path.length >= 2) {
    return path.join('/');
  }
  return null;
}
function fetchProjectId(repoPath, token) {
  const apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoPath)}`;
  console.log('Fetching project ID from:', apiUrl);

  return fetch(apiUrl, {
    headers: {
      'PRIVATE-TOKEN': token
    }
  })
    .then(response => {
      if (response.status === 404) {
        throw new Error(`Please navigate to the root of the project to load pipelines.\n
        "Its a feature not a bug" - by all developers ever\n
        Want to handle it yourself ?\n
        PR us at :\n https://github.com/target-ops/2Gview`);
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Project data:', data);
      return data.id;
    });
}
function fetchPipelines(projectId, token) {
  const apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/pipelines?include_user=true`;
  console.log('Fetching pipelines from:', apiUrl);
  console.log('projectId:', projectId);

  return fetch(apiUrl, {
    headers: {
      'PRIVATE-TOKEN': token
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
}

function createPipelineContainer() {
  console.log('Creating pipeline container');
  const container = document.createElement('div');
  container.id = 'gitlab-pipeline-viewer';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 350px;
    height: 100%;
    background-color: #f3f3f3;
    border-left: 1px solid #ccc;
    padding: 20px;
    overflow-y: auto;
    z-index: 1000;
    transition: transform 0.3s ease-in-out;
  `;
  
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'View';
  toggleButton.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 10px 10px;
    background-color: #ddd;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  
  container.innerHTML = `
<h1 style="text-align: center; background-color: #f0f0f0; padding: 20px;">
  <a href="https://target-ops.io/oss/" target="_blank">
    <img src="https://target-ops.io/targetOpsBlackNOBG-FULL_hu955840a1540f7e2828c3ab7e503114de_44064_288x288_fill_q75_h2_box_center_2.webp" alt="Icon" width="50" height="50">
  </a>
</h1>
    <h2 style="text-align: center;">Pipelines</h2>
    <div id="pipeline-list"></div>
  `;
  
  container.appendChild(toggleButton);
  document.body.appendChild(container);
  
  let isMinimized = false;
  toggleButton.addEventListener('click', () => {
    if (isMinimized) {
      container.style.transform = 'translateX(0)';
      toggleButton.textContent = 'View';
    } else {
      container.style.transform = 'translateX(290px)';
      toggleButton.textContent = 'View';
    }
    isMinimized = !isMinimized;
  });
  
  console.log('Pipeline container created and added to the page');
}
function displayPipelines(pipelines) {
  console.log('Displaying pipelines:', pipelines);
  const pipelineList = document.getElementById('pipeline-list');
  pipelineList.innerHTML = '';

  if (pipelines.length === 0) {
    pipelineList.innerHTML = '<p>No pipelines found for this project.</p>';
    return;
  }

  pipelines.forEach(pipeline => {
    const pipelineElement = document.createElement('div');
    pipelineElement.style.cssText = `
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
    `;
    pipelineElement.innerHTML = `
      <span style="display: block; font-size: 12px; color: #666;"><a href="${pipeline.web_url}" style="display: block; font-size: 12px; color: #666; margin-top: 5px; text-decoration: none;">${pipeline.name}</a></span>
      <span style="font-weight: bold;">#${pipeline.id}</span>
      <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: bold; background-color: ${getStatusColor(pipeline.status)}; color: #fff;">${pipeline.status}</span>
      <span style="display: block; font-size: 12px; color: #666; margin-top: 5px;">Ref: ${pipeline.ref}</span>
      <span style="display: block; font-size: 12px; color: #666;">SHA: ${pipeline.sha.substr(0, 8)}</span>
      <span style="display: block; font-size: 12px; color: #666;">Initiated by: ${pipeline.user ? pipeline.user.name : 'API res - Unknown'}</span>
    `;
    pipelineList.appendChild(pipelineElement);
  });
  console.log('Pipelines displayed');
}
function getStatusColor(status) {
  const colors = {
    'success': '#2ecc71',
    'failed': '#e74c3c',
    'running': '#3498db',
    'pending': '#f39c12'
  };
  return colors[status] || '#95a5a6';
}

function showError(message) {
  console.error('Showing error:', message);
  const pipelineList = document.getElementById('pipeline-list');
  pipelineList.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">${message}</p>`;
}

function initializePipelineViewer() {
  console.log('Initializing pipeline viewer');
  chrome.storage.sync.get(['gitlabToken'], (result) => {
    console.log('GitLab token retrieved from storage:', result.gitlabToken ? 'Token exists' : 'No token');
    if (!result.gitlabToken) {
      showError('GitLab token not set. Please set it in the extension options.');
      return;
    }

    const repoPath = getRepoPathFromUrl();
    if (!repoPath) {
      showError('Unable to determine repository path from URL.');
      return;
    }

    createPipelineContainer();

    fetchProjectId(repoPath, result.gitlabToken)
      .then(projectId => {
        console.log('Fetched project ID:', projectId);
        return fetchPipelines(projectId, result.gitlabToken);
      })
      .then(pipelines => {
        displayPipelines(pipelines);
      })
      .catch(error => {
        console.error('Error:', error);
        showError(`Error: ${error.message}`);
      });
  });
}

// Check if we're on a GitLab page and initialize the pipeline viewer
if (window.location.hostname.includes('gitlab.com')) {
  initializePipelineViewer();
}

console.log('Pipeline Viewer content script fully loaded');