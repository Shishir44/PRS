/**
 * project-manager.js - Functions for project management in the PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 */

// Make sure currentUsername is accessible, even if it hasn't been set yet in window
let currentUsername = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Project manager loaded, checking for username');
    
    // Try to get username from window object (set in base.html)
    if (window.currentUsername) {
        currentUsername = window.currentUsername;
        console.log('Found username in window object:', currentUsername);
    } else {
        // Fallback: try to get from meta tag or browser storage
        const usernameElement = document.querySelector('meta[name="username"]');
        if (usernameElement && usernameElement.getAttribute('content')) {
            currentUsername = usernameElement.getAttribute('content');
            console.log('Found username in meta tag:', currentUsername);
        } else if (sessionStorage.getItem('username')) {
            currentUsername = sessionStorage.getItem('username');
            console.log('Found username in sessionStorage:', currentUsername);
        } else {
            // Last resort - try to extract from UI elements
            const navbarUsername = document.querySelector('.navbar-nav .nav-link');
            if (navbarUsername && navbarUsername.textContent.includes('(')) {
                currentUsername = navbarUsername.textContent.split('(')[0].trim();
                console.log('Extracted username from navbar:', currentUsername);
            }
        }
    }
});

/**
 * Function to toggle the projects section visibility based on multi-project selection
 */
function toggleProjectsSection() {
    // Check if any radio is checked, if not select one based on projects
    if (!document.getElementById('single_project').checked && !document.getElementById('multi_project').checked) {
        // Default selection - if we already have multiple projects, select multi
        let projectsData = [];
        try {
            const currentData = document.getElementById('projects_data').value;
            if (currentData) {
                projectsData = JSON.parse(currentData);
            }
        } catch (e) {
            console.error('Error parsing projects data:', e);
        }
        
        // If we have more than one project, select multi-project
        if (projectsData.length > 1) {
            document.getElementById('multi_project').checked = true;
        } else {
            // Otherwise, select single project if no selection made
            document.getElementById('single_project').checked = true;
        }
    }
    
    const isMultiProject = document.getElementById('multi_project').checked;
    const projectsSection = document.getElementById('projectsSection');
    const projectsSectionTitle = document.querySelector('#projectsSection .card-header h6');
    const addProjectButtonContainer = document.getElementById('addProjectButtonContainer');
    
    // Always check if project data suggests multi-project
    let projectsData = [];
    try {
        const currentData = document.getElementById('projects_data').value;
        if (currentData) {
            projectsData = JSON.parse(currentData);
        }
    } catch (e) {
        console.error('Error parsing projects data:', e);
    }
    
    // If user has added multiple projects but selected single project, auto-switch to multi-project
    if (!isMultiProject && projectsData.length > 1) {
        document.getElementById('multi_project').checked = true;
        // Recursively call this function to handle the change
        toggleProjectsSection();
        return;
    }
    
    if (isMultiProject) {
        // Show multi-project interface
        projectsSection.classList.remove('d-none');
        projectsSectionTitle.textContent = 'Multiple Projects';
        document.querySelector('#projectsList .alert p').textContent = 'Add your first project using the button below.';
        
        // Show add project button for multi-project deals
        addProjectButtonContainer.classList.remove('d-none');
        
        // Close project form if open
        toggleAddProjectForm(false);
    } else {
        // For single project, show a simplified interface
        projectsSection.classList.remove('d-none'); // Always show, even for single project
        projectsSectionTitle.textContent = 'Project Details (Required)';
        document.querySelector('#projectsList .alert p').textContent = 'Every deal requires at least one project. Please complete the project details below.';
        
        // Hide add project button for single project deals
        addProjectButtonContainer.classList.add('d-none');
        
        // Reset existing projects data only if there are multiple projects
        if (projectsData.length > 1) {
            resetProjectsData();
        }
        
        // Automatically show the add project form for single project deals
        showAddProjectForm();
    }
}

/**
 * Function to show the Add Project form
 */
function showAddProjectForm() {
    // Set minimum date for deadline
    const today = new Date().toISOString().split('T')[0];
    const deadlineInput = document.getElementById('new_project_deadline');
    if (deadlineInput) {
        deadlineInput.min = today;
    }
    
    // Show the form and enable required attributes
    const form = document.getElementById('addProjectForm');
    if (form) {
        form.classList.remove('d-none');
        
        // Make fields required when form is shown
        form.querySelectorAll('input[data-required], select[data-required], textarea[data-required]').forEach(el => {
            el.setAttribute('required', '');
        });
    }
}

/**
 * Function to toggle the add project form visibility
 * @param {boolean} show - Whether to show or hide the form
 */
function toggleAddProjectForm(show) {
    const form = document.getElementById('addProjectForm');
    if (!form) return;
    
    const requiredFields = form.querySelectorAll('[data-required]');
    
    if (show) {
        form.classList.remove('d-none');
        // Enable required attributes when form is shown
        requiredFields.forEach(field => {
            field.setAttribute('required', '');
        });
    } else {
        form.classList.add('d-none');
        // Disable required attributes when form is hidden
        requiredFields.forEach(field => {
            field.removeAttribute('required');
        });
        // Reset form fields
        document.getElementById('new_project_name').value = '';
        document.getElementById('new_project_supervisor').value = '';
        document.getElementById('new_project_description').value = '';
        
        // Reset file input if present
        if (document.getElementById('new_project_files')) {
            document.getElementById('new_project_files').value = '';
        }
    }
}

/**
 * Function to add a project to the list with file handling
 */
function addProjectToList() {
    // Temporarily add required attributes for validation
    const form = document.getElementById('addProjectForm');
    if (!form) return;
    
    const requiredFields = form.querySelectorAll('[data-required="true"]');
    requiredFields.forEach(field => {
        field.setAttribute('required', '');
    });
    
    // Get form data
    const projectName = document.getElementById('new_project_name').value.trim();
    const projectSupervisor = document.getElementById('new_project_supervisor').value;
    const projectDescription = document.getElementById('new_project_description').value.trim();
    const projectDeadline = document.getElementById('new_project_deadline').value;
    
    // Form validation
    if (!projectName || !projectSupervisor || !projectDeadline) {
        // Use browser's built-in validation
        const invalidField = form.querySelector(':invalid');
        if (invalidField) {
            invalidField.focus();
            return;
        }
        
        // Fallback manual validation
        if (!projectName) {
            alert('Project name is required');
            return;
        }
        if (!projectSupervisor) {
            alert('Please select a supervisor');
            return;
        }
        if (!projectDeadline) {
            alert('Project deadline is required');
            return;
        }
    }
    
    // Remove required attributes after validation
    requiredFields.forEach(field => {
        field.removeAttribute('required');
    });
    
    // Create new project object
    const newProject = {
        id: 'temp_' + Date.now(), // Temporary ID for frontend
        name: projectName,
        supervisor: projectSupervisor,
        description: projectDescription,
        deadline: projectDeadline,
        created_by: currentUsername
    };
    
    // Get existing projects data
    let projectsData = [];
    try {
        const currentData = document.getElementById('projects_data').value;
        if (currentData) {
            projectsData = JSON.parse(currentData);
        }
    } catch (e) {
        console.error('Error parsing existing projects data:', e);
    }
    
    // Add new project
    projectsData.push(newProject);
    
    // Update hidden input with updated projects data
    document.getElementById('projects_data').value = JSON.stringify(projectsData);
    
    // Update the UI
    renderProjectsList(projectsData);
    
    // Close the form after adding
    toggleAddProjectForm(false);
    
    // Show success message
    showAlert('success', 'Project added successfully!');
}

/**
 * Function to render the projects list in the UI
 * @param {Array} projects - Array of project objects to render
 */
function renderProjectsList(projects) {
    const projectsListElement = document.getElementById('projectsList');
    if (!projectsListElement) return;
    
    if (projects.length === 0) {
        // No projects yet
        projectsListElement.innerHTML = `
            <div class="alert alert-info">
                <p class="mb-0">No projects found. Add your first project using the button above.</p>
            </div>
        `;
    } else {
        // Create HTML for projects list
        let projectsHTML = '<div class="list-group">';
        
        projects.forEach(project => {
            const projectDate = project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline';
            
            projectsHTML += `
                <div class="list-group-item list-group-item-action" data-project-id="${project.id}">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${project.name}</h5>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeProjectFromList('${project.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="mb-2">
                        <span class="badge bg-primary">Supervisor: ${project.supervisor}</span>
                        <span class="badge bg-info">Deadline: ${projectDate}</span>
                    </div>
                    ${project.description ? `<p class="mb-1 small">${project.description}</p>` : ''}
                </div>
            `;
        });
        
        projectsHTML += '</div>';
        projectsListElement.innerHTML = projectsHTML;
    }
}

/**
 * Function to remove a project from the list
 * @param {string} projectId - ID of the project to remove
 */
function removeProjectFromList(projectId) {
    // Get existing projects data
    let projectsData = [];
    try {
        const currentData = document.getElementById('projects_data').value;
        if (currentData) {
            projectsData = JSON.parse(currentData);
        }
    } catch (e) {
        console.error('Error parsing projects data:', e);
        return;
    }
    
    // Filter out the project to remove
    projectsData = projectsData.filter(project => project.id !== projectId);
    
    // Update hidden input with filtered projects data
    document.getElementById('projects_data').value = JSON.stringify(projectsData);
    
    // Update the UI
    renderProjectsList(projectsData);
    
    // Show success message
    showAlert('success', 'Project removed successfully!');
}

/**
 * Function to load projects for a deal
 * @param {string} dealId - ID of the deal to load projects for
 */
function loadDealProjects(dealId) {
    console.log('loadDealProjects called for dealId:', dealId);
    
    // Show initial loading state
    const projectsList = document.getElementById('projectsList');
    if (projectsList) {
        projectsList.innerHTML = `
            <div class="alert alert-info">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mb-0">Loading projects...</p>
                </div>
            </div>
        `;
    }
    
    fetch(`/api/deals/${dealId}/projects/`)
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error loading projects - Server responded with non-OK status:', response.status, errorText);
                if (projectsList) {
                    projectsList.innerHTML = `
                        <div class="alert alert-danger">
                            <p class="mb-0">Error: Could not load projects (${response.status}). Check console for details.</p>
                        </div>
                    `;
                }
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.projects) {
                const projects = data.projects;
                
                // Render projects
                if (projects.length === 0) {
                    if (projectsList) {
                        projectsList.innerHTML = `
                            <div class="alert alert-info">
                                <p class="mb-0">No projects found for this deal. Add your first project using the button above.</p>
                            </div>
                        `;
                    }
                } else {
                    let projectsHtml = `<div class="list-group">`;
                    
                    projects.forEach(project => {
                        const deadline = project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline';
                        
                        projectsHtml += `
                            <div class="list-group-item list-group-item-action">
                                <div class="d-flex w-100 justify-content-between align-items-center">
                                    <h5 class="mb-1">${project.name}</h5>
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="viewProjectDetails('${project.id}')">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-success" onclick="viewProjectFiles('${project.id}')">
                                            <i class="bi bi-file-earmark"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <span class="badge bg-primary">Supervisor: ${project.supervisor}</span>
                                    <span class="badge bg-info">Deadline: ${deadline}</span>
                                    <span class="badge bg-secondary">Assigned by: ${project.assigned_by || 'Unknown'}</span>
                                </div>
                                ${project.description ? `<p class="mb-1 small">${project.description}</p>` : ''}
                            </div>
                        `;
                    });
                    
                    projectsHtml += `</div>`;
                    if (projectsList) {
                        projectsList.innerHTML = projectsHtml;
                    }
                }
            } else {
                if (projectsList) {
                    projectsList.innerHTML = `
                        <div class="alert alert-danger">
                            <p class="mb-0">Error: ${data.error || 'Could not load projects for this deal.'}</p>
                        </div>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching projects:', error);
            if (projectsList) {
                projectsList.innerHTML = `
                    <div class="alert alert-danger">
                        <p class="mb-0">Error: Could not load projects for this deal. Please try again.</p>
                    </div>
                `;
            }
        });
}

/**
 * Helper function to show an alert message
 * @param {string} type - Alert type (success, danger, warning, info)
 * @param {string} message - Alert message
 */
function showAlert(type, message) {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertsContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alerts = alertsContainer.querySelectorAll('.alert');
        alerts.forEach(alert => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);
}
