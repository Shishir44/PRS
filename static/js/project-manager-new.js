/**
 * project-manager.js - Functions for project management in the PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 * Complete rebuild to fix project listing and creation functionality
 */

// Global variables
let currentUsername = '';
const API_BASE_URL = '/api/projects/';
const KNOWN_USERS = ['sales1', 'sales2', 'verifier1', 'supervisor1', 'client1'];

/**
 * Initialize the project manager when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Project manager initialized');
    
    // Get current username from session
    getCurrentUsername();
    
    // Set up event listeners
    setupEventListeners();
    
    // If we have a deal ID in the page, load its projects
    const dealIdInput = document.getElementById('deal_id');
    if (dealIdInput && dealIdInput.value) {
        loadDealProjects(dealIdInput.value);
    }
    
    // Handle radio button selection for project type
    toggleProjectsSection();
});

/**
 * Get the current username from various sources
 */
function getCurrentUsername() {
    // Try to get from window object (session)
    if (window.currentUsername) {
        currentUsername = window.currentUsername;
        console.log('Username from session:', currentUsername);
    } 
    // Try to get from meta tag
    else if (document.querySelector('meta[name="username"]')) {
        currentUsername = document.querySelector('meta[name="username"]').getAttribute('content');
        console.log('Username from meta tag:', currentUsername);
    }
    // Try to get from sessionStorage
    else if (sessionStorage.getItem('username')) {
        currentUsername = sessionStorage.getItem('username');
        console.log('Username from sessionStorage:', currentUsername);
    }
    // Try to extract from navbar (if logged in)
    else {
        const userElement = document.querySelector('.navbar .username');
        if (userElement) {
            currentUsername = userElement.textContent.trim();
            console.log('Username from navbar:', currentUsername);
        }
    }
    
    // Fallback to a known user if username couldn't be determined
    if (!currentUsername || currentUsername === 'not-set') {
        currentUsername = 'sales2'; // Default to a known valid user
        console.log('Using default username:', currentUsername);
    }
    
    return currentUsername;
}

/**
 * Set up all event listeners for the project management page
 */
function setupEventListeners() {
    // Project type radio buttons
    const singleProjectRadio = document.getElementById('single_project');
    const multiProjectRadio = document.getElementById('multi_project');
    
    if (singleProjectRadio) {
        singleProjectRadio.addEventListener('change', toggleProjectsSection);
    }
    
    if (multiProjectRadio) {
        multiProjectRadio.addEventListener('change', toggleProjectsSection);
    }
    
    // Add project button
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', showAddProjectForm);
    }
    
    // Cancel add project button
    const cancelAddProjectBtn = document.getElementById('cancelAddProjectBtn');
    if (cancelAddProjectBtn) {
        cancelAddProjectBtn.addEventListener('click', function() {
            toggleAddProjectForm(false);
        });
    }
    
    // Add project form submit
    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addProjectToList();
        });
    }
}

/**
 * Toggle the projects section based on selected project type
 */
function toggleProjectsSection() {
    // Check if any radio is checked, if not select one based on projects
    if (!document.getElementById('single_project')?.checked && !document.getElementById('multi_project')?.checked) {
        // Default selection - if we already have multiple projects, select multi
        let projectsData = [];
        try {
            const currentData = document.getElementById('projects_data')?.value;
            if (currentData) {
                projectsData = JSON.parse(currentData);
            }
        } catch (e) {
            console.error('Error parsing projects data:', e);
        }
        
        // If we have more than one project, select multi-project
        if (projectsData.length > 1) {
            const multiProjectRadio = document.getElementById('multi_project');
            if (multiProjectRadio) {
                multiProjectRadio.checked = true;
            }
        } else {
            // Otherwise, select single project if no selection made
            const singleProjectRadio = document.getElementById('single_project');
            if (singleProjectRadio) {
                singleProjectRadio.checked = true;
            }
        }
    }
    
    const isMultiProject = document.getElementById('multi_project')?.checked;
    const projectsSection = document.getElementById('projectsSection');
    const projectsSectionTitle = document.querySelector('#projectsSection .card-header h6');
    const addProjectButtonContainer = document.getElementById('addProjectButtonContainer');
    
    if (!projectsSection || !projectsSectionTitle || !addProjectButtonContainer) {
        console.error('Missing required project section elements');
        return;
    }
    
    // Always check if project data suggests multi-project
    let projectsData = [];
    try {
        const currentData = document.getElementById('projects_data')?.value;
        if (currentData) {
            projectsData = JSON.parse(currentData);
        }
    } catch (e) {
        console.error('Error parsing projects data:', e);
    }
    
    // If user has added multiple projects but selected single project, auto-switch to multi-project
    if (!isMultiProject && projectsData.length > 1) {
        const multiProjectRadio = document.getElementById('multi_project');
        if (multiProjectRadio) {
            multiProjectRadio.checked = true;
            // Recursively call this function to handle the change
            toggleProjectsSection();
            return;
        }
    }
    
    if (isMultiProject) {
        // Show multi-project interface
        projectsSection.classList.remove('d-none');
        projectsSectionTitle.textContent = 'Multiple Projects';
        
        const alertTextElement = document.querySelector('#projectsList .alert p');
        if (alertTextElement) {
            alertTextElement.textContent = 'Add your first project using the button below.';
        }
        
        // Show add project button for multi-project deals
        addProjectButtonContainer.classList.remove('d-none');
        
        // Close project form if open
        toggleAddProjectForm(false);
    } else {
        // For single project, show a simplified interface
        projectsSection.classList.remove('d-none'); // Always show, even for single project
        projectsSectionTitle.textContent = 'Project Details (Required)';
        
        const alertTextElement = document.querySelector('#projectsList .alert p');
        if (alertTextElement) {
            alertTextElement.textContent = 'Every deal requires at least one project. Please complete the project details below.';
        }
        
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
 * Reset projects data to empty array
 */
function resetProjectsData() {
    const projectsDataInput = document.getElementById('projects_data');
    if (projectsDataInput) {
        projectsDataInput.value = JSON.stringify([]);
    }
    
    const projectsList = document.getElementById('projectsList');
    if (projectsList) {
        projectsList.innerHTML = `
            <div class="alert alert-info">
                <p class="mb-0">Every deal requires at least one project. Please complete the project details below.</p>
            </div>
        `;
    }
}

/**
 * Show the add project form
 */
function showAddProjectForm() {
    // Set minimum date for deadline
    const today = new Date().toISOString().split('T')[0];
    const deadlineInput = document.getElementById('new_project_deadline');
    if (deadlineInput) {
        deadlineInput.min = today;
    }
    
    // Show the form
    toggleAddProjectForm(true);
}

/**
 * Toggle the add project form visibility
 * @param {boolean} show - Whether to show or hide the form
 */
function toggleAddProjectForm(show) {
    const form = document.getElementById('addProjectForm');
    if (!form) {
        console.error('Add project form not found');
        return;
    }
    
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
        form.reset();
    }
}

/**
 * Add a project to the list with file handling
 */
function addProjectToList() {
    // Get form element
    const form = document.getElementById('addProjectForm');
    if (!form) {
        console.error('Add project form not found');
        return;
    }
    
    // Temporarily add required attributes for validation
    const requiredFields = form.querySelectorAll('[data-required="true"]');
    requiredFields.forEach(field => {
        field.setAttribute('required', '');
    });
    
    // Get form data
    const projectName = document.getElementById('new_project_name')?.value.trim();
    const projectSupervisor = document.getElementById('new_project_supervisor')?.value;
    const projectDescription = document.getElementById('new_project_description')?.value.trim();
    const projectDeadline = document.getElementById('new_project_deadline')?.value;
    
    // Form validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return false;
    }
    
    // Create new project object
    const newProject = {
        id: 'temp_' + Date.now(), // Temporary ID for frontend
        name: projectName,
        supervisor: projectSupervisor,
        description: projectDescription,
        deadline: projectDeadline,
        assigned_by: currentUsername
    };
    
    // Get existing projects data
    let projectsData = [];
    try {
        const projectsDataInput = document.getElementById('projects_data');
        if (projectsDataInput && projectsDataInput.value) {
            projectsData = JSON.parse(projectsDataInput.value);
        }
    } catch (e) {
        console.error('Error parsing existing projects data:', e);
    }
    
    // Add new project
    projectsData.push(newProject);
    
    // Update hidden input with updated projects data
    const projectsDataInput = document.getElementById('projects_data');
    if (projectsDataInput) {
        projectsDataInput.value = JSON.stringify(projectsData);
    }
    
    // Update the UI
    renderProjectsList(projectsData);
    
    // Close the form after adding
    toggleAddProjectForm(false);
    
    // Show success message
    showAlert('success', 'Project added successfully!');
    
    return false;
}

/**
 * Render the projects list in the UI
 * @param {Array} projects - Array of project objects to render
 */
function renderProjectsList(projects) {
    const projectsListElement = document.getElementById('projectsList');
    if (!projectsListElement) {
        console.error('Projects list element not found');
        return;
    }
    
    if (!projects || projects.length === 0) {
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
                        <span class="badge bg-secondary">Assigned by: ${project.assigned_by || currentUsername}</span>
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
 * Remove a project from the list
 * @param {string} projectId - ID of the project to remove
 */
function removeProjectFromList(projectId) {
    // Get existing projects data
    let projectsData = [];
    try {
        const projectsDataInput = document.getElementById('projects_data');
        if (projectsDataInput && projectsDataInput.value) {
            projectsData = JSON.parse(projectsDataInput.value);
        }
    } catch (e) {
        console.error('Error parsing projects data:', e);
        return;
    }
    
    // Filter out the project to remove
    projectsData = projectsData.filter(project => project.id !== projectId);
    
    // Update hidden input with filtered projects data
    const projectsDataInput = document.getElementById('projects_data');
    if (projectsDataInput) {
        projectsDataInput.value = JSON.stringify(projectsData);
    }
    
    // Update the UI
    renderProjectsList(projectsData);
    
    // Show success message
    showAlert('success', 'Project removed successfully!');
}

/**
 * Load projects for a deal
 * @param {string} dealId - ID of the deal to load projects for
 */
function loadDealProjects(dealId) {
    console.log('Loading projects for deal:', dealId);
    
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) {
        console.error('Projects list element not found');
        return;
    }
    
    // Show loading state
    projectsList.innerHTML = `
        <div class="alert alert-info">
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>Loading projects...</span>
            </div>
        </div>
    `;
    
    // Build the API URL with username
    const url = `/api/deals/${dealId}/projects/?username=${encodeURIComponent(currentUsername)}`;
    console.log('Fetching projects from:', url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Projects data received:', data);
            
            if (data.success && data.projects) {
                const projects = data.projects;
                
                // Render projects
                if (projects.length === 0) {
                    projectsList.innerHTML = `
                        <div class="alert alert-info">
                            <p class="mb-0">No projects found for this deal. Add your first project using the button above.</p>
                        </div>
                    `;
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
                    projectsList.innerHTML = projectsHtml;
                }
            } else {
                projectsList.innerHTML = `
                    <div class="alert alert-danger">
                        <p class="mb-0">Error: ${data.error || 'Could not load projects for this deal.'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching projects:', error);
            projectsList.innerHTML = `
                <div class="alert alert-danger">
                    <p class="mb-0">Error: ${error.message || 'Could not load projects for this deal.'}</p>
                </div>
            `;
        });
}

/**
 * View project details
 * @param {string} projectId - ID of the project to view
 */
function viewProjectDetails(projectId) {
    console.log('Viewing project details:', projectId);
    // Implementation to be added
}

/**
 * View project files
 * @param {string} projectId - ID of the project to view files for
 */
function viewProjectFiles(projectId) {
    console.log('Viewing project files:', projectId);
    // Implementation to be added
}

/**
 * Show an alert message
 * @param {string} type - Alert type (success, danger, warning, info)
 * @param {string} message - Alert message
 */
function showAlert(type, message) {
    // Get or create alerts container
    let alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) {
        alertsContainer = document.createElement('div');
        alertsContainer.id = 'alertsContainer';
        
        // Find a good place to insert the alerts container
        const projectsSection = document.getElementById('projectsSection');
        if (projectsSection) {
            projectsSection.insertBefore(alertsContainer, projectsSection.firstChild);
        } else {
            // Fallback - add to body
            document.body.appendChild(alertsContainer);
        }
    }
    
    // Create alert ID
    const alertId = 'alert-' + Date.now();
    
    // Create alert HTML
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Add alert to container
    alertsContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, 5000);
}
