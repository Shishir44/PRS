/**
 * project-viewer.js - Functions for viewing and managing projects
 * Follows function-first approach where all UI interactions are implemented as functions
 */

/**
 * Function to load all projects for the current user
 */
function loadProjects() {
    const projectsTableBody = document.getElementById('projectsTableBody');
    if (!projectsTableBody) return;
    
    // Show loading indicator
    projectsTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading projects...</p>
            </td>
        </tr>
    `;
    
    // Fetch projects
    fetch('/api/projects/')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.projects && data.projects.length > 0) {
                renderProjects(data.projects);
            } else {
                // No projects or error
                projectsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-info-circle me-2"></i>
                                No projects found. Projects will appear here when deals are verified.
                            </div>
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading projects:', error);
            projectsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Error loading projects. Please try again later.
                        </div>
                    </td>
                </tr>
            `;
        });
}

/**
 * Function to render projects in the table
 * @param {Array} projects - Array of project objects
 */
function renderProjects(projects) {
    const projectsTableBody = document.getElementById('projectsTableBody');
    if (!projectsTableBody) return;
    
    // Clear existing content
    projectsTableBody.innerHTML = '';
    
    // Render each project
    projects.forEach(project => {
        const row = document.createElement('tr');
        row.className = 'project-row';
        row.setAttribute('data-status', project.status || 'active');
        
        // Format the deadline
        const deadline = project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'Not set';
        
        // Create project status badge
        let statusBadge = '';
        if (project.status === 'active') {
            statusBadge = '<span class="badge bg-success">Active</span>';
        } else if (project.status === 'completed') {
            statusBadge = '<span class="badge bg-primary">Completed</span>';
        } else if (project.status === 'pending') {
            statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
        } else {
            statusBadge = `<span class="badge bg-info">${project.status || 'Unknown'}</span>`;
        }
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="icon-square bg-light text-dark flex-shrink-0 me-3">
                        <i class="bi bi-folder"></i>
                    </div>
                    <div>
                        <h6 class="mb-0">${project.name}</h6>
                        <small class="text-muted">Created: ${new Date(project.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
            </td>
            <td>${project.deal_title || 'N/A'}</td>
            <td>${project.supervisor || 'Not assigned'}</td>
            <td>${statusBadge}</td>
            <td>${deadline}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-info" onclick="viewProjectDetails('${project.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="viewProjectFiles('${project.id}')">
                        <i class="bi bi-folder"></i>
                    </button>
                    ${project.status !== 'completed' ? 
                    `<button type="button" class="btn btn-sm btn-success" onclick="markProjectComplete('${project.id}')">
                        <i class="bi bi-check-lg"></i>
                    </button>` : ''}
                </div>
            </td>
        `;
        
        projectsTableBody.appendChild(row);
    });
}

/**
 * Function to filter projects by status
 * @param {string} status - Status to filter by (all, active, completed, pending)
 */
function filterProjects(status) {
    const projectRows = document.querySelectorAll('#projectsTableBody tr.project-row');
    
    projectRows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (status === 'all' || rowStatus === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Function to search projects based on search input
 * @param {string} searchText - Text to search for
 */
function searchProjects(searchText) {
    const projectRows = document.querySelectorAll('#projectsTableBody tr.project-row');
    const searchLower = searchText.toLowerCase();
    
    projectRows.forEach(row => {
        // Skip rows that are already hidden by status filter
        if (row.style.display === 'none') return;
        
        const projectText = row.textContent.toLowerCase();
        row.style.display = projectText.includes(searchLower) ? '' : 'none';
    });
}

/**
 * Function to view project details
 * @param {string} projectId - ID of the project to view
 */
function viewProjectDetails(projectId) {
    // Fetch project details
    fetch(`/api/projects/${projectId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.project) {
                const project = data.project;
                
                // Show project details in a modal (implementation depends on your UI)
                // For example:
                alert(`Project Details:\nName: ${project.name}\nDeal: ${project.deal_title}\nSupervisor: ${project.supervisor}\nDeadline: ${new Date(project.deadline).toLocaleDateString()}`);
            } else {
                alert('Error: Could not load project details');
            }
        })
        .catch(error => {
            console.error('Error fetching project:', error);
            alert('Error: Could not load project details');
        });
}

/**
 * Function to view project files
 * @param {string} projectId - ID of the project to view files for
 */
function viewProjectFiles(projectId) {
    // Fetch project files
    fetch(`/api/projects/${projectId}/files/`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.files) {
                const files = data.files;
                
                if (files.length === 0) {
                    alert('No files found for this project');
                } else {
                    // Show files in a modal (implementation depends on your UI)
                    // For example:
                    const fileList = files.map(file => file.name).join('\n');
                    alert(`Project Files:\n${fileList}`);
                }
            } else {
                alert('Error: Could not load project files');
            }
        })
        .catch(error => {
            console.error('Error fetching files:', error);
            alert('Error: Could not load project files');
        });
}

/**
 * Function to mark a project as complete
 * @param {string} projectId - ID of the project to mark as complete
 */
function markProjectComplete(projectId) {
    if (!confirm('Are you sure you want to mark this project as complete?')) {
        return;
    }
    
    // Update project status
    fetch(`/api/projects/${projectId}/complete/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Project marked as complete!');
            // Reload projects to show updated status
            loadProjects();
        } else {
            alert('Error: ' + (data.error || 'Could not update project'));
        }
    })
    .catch(error => {
        console.error('Error updating project:', error);
        alert('Error: Could not update project');
    });
}

/**
 * Function to show the file upload modal
 */
function showFileUploadModal() {
    const fileUploadModal = new bootstrap.Modal(document.getElementById('fileUploadModal'));
    
    // Reset form
    document.getElementById('fileUploadForm').reset();
    document.getElementById('uploadResult').classList.add('d-none');
    document.getElementById('uploadProgressContainer').classList.add('d-none');
    
    // Show modal
    fileUploadModal.show();
}

/**
 * Function to upload files
 */
function uploadFiles() {
    const form = document.getElementById('fileUploadForm');
    const formData = new FormData(form);
    
    // Form validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show progress bar
    const progressBar = document.getElementById('uploadProgress');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const resultContainer = document.getElementById('uploadResult');
    
    progressContainer.classList.remove('d-none');
    resultContainer.classList.add('d-none');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    
    // Disable upload button during upload
    const uploadButton = document.getElementById('uploadButton');
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    
    // Upload files
    fetch('/api/files/upload/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    Files uploaded successfully!
                </div>
            `;
            // Reset form
            form.reset();
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error: ${data.error || 'Could not upload files'}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error uploading files:', error);
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error: Could not upload files
            </div>
        `;
    })
    .finally(() => {
        // Show result
        resultContainer.classList.remove('d-none');
        // Reset button
        uploadButton.disabled = false;
        uploadButton.innerHTML = '<i class="bi bi-cloud-upload me-2"></i> Upload Files';
        // Set progress to 100%
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
    });
}

/**
 * Helper function to get CSRF token
 * @returns {string} - CSRF token
 */
function getCsrfToken() {
    return document.querySelector('input[name="csrfmiddlewaretoken"]').value;
}
