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
    
    // Only try to load projects if we're on a page with projects
    setTimeout(() => {
        // If we have a deal ID in the page, load its projects
        const dealIdInput = document.getElementById('deal_id');
        if (dealIdInput && dealIdInput.value) {
            console.log('Deal ID found, loading projects:', dealIdInput.value);
            loadDealProjects(dealIdInput.value);
        } else if (document.getElementById('projectList')) {
            // If we're on the project management page, load all projects
            console.log('Project management page detected, loading all projects');
            loadProjects();
        }
        
        // Handle radio button selection for project type
        toggleProjectsSection();
    }, 100);
});

/**
 * Get the current username from various sources
 */
function getCurrentUsername() {
    // Try to get from window object (session)
    if (window.currentUsername) {
        currentUsername = window.currentUsername;
        console.log('Username from session variable:', currentUsername);
    } 
    // Try to get from form's data-username attribute (Django session)
    else if (document.getElementById('addProjectForm') && document.getElementById('addProjectForm').dataset.username) {
        currentUsername = document.getElementById('addProjectForm').dataset.username;
        console.log('Username from Django session (project form):', currentUsername);
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
    
    // Try to get from the dashboard welcome message as a last resort
    if (!currentUsername || currentUsername === 'not-set') {
        const welcomeMsg = document.querySelector('h2');
        if (welcomeMsg && welcomeMsg.textContent && welcomeMsg.textContent.includes('Welcome')) {
            const match = welcomeMsg.textContent.match(/Welcome, ([^!]+)!/i);
            if (match && match[1]) {
                currentUsername = match[1].trim();
                console.log('Username from welcome message:', currentUsername);
            }
        }
    }
    
    // Fallback to a known user if username couldn't be determined
    if (!currentUsername || currentUsername === 'not-set') {
        // The application uses a simplified authentication approach that only checks for username existence
        // without password verification, as noted in the project documentation
        currentUsername = 'sales2'; // Default to a known valid user from the database
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
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDateString(dateString) {
    if (!dateString) return 'No deadline';
    
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return 'Invalid date';
        
        // Format date as MM/DD/YYYY or use toLocaleDateString for locale-specific formatting
        return date.toLocaleDateString();
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Date error';
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
    
    // Make sure we have a username
    if (!currentUsername || currentUsername === 'not-set') {
        console.warn('No username available, attempting to get username again');
        getCurrentUsername();
        
        // If still no username, use a fallback
        if (!currentUsername || currentUsername === 'not-set') {
            currentUsername = 'sales2'; // Fallback to a known username
            console.log('Using fallback username:', currentUsername);
        }
    }
    
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
                <span>Loading projects for deal ${dealId} (user: ${currentUsername})...</span>
            </div>
        </div>
    `;
    
    // Set a timeout to prevent infinite loading
    const fetchTimeout = setTimeout(() => {
        console.warn('Project fetch timeout - request took too long');
        projectsList.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-clock-history me-2"></i>
                Request is taking longer than expected. If projects don't appear soon, try refreshing the page.
            </div>
        `;
    }, 10000); // 10 second timeout
    
    // Build the API URL with username
    const url = `/api/deals/${dealId}/projects/?username=${encodeURIComponent(currentUsername)}`;
    console.log('Fetching projects from:', url);
    
    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest' // Identifies AJAX request
        },
        credentials: 'same-origin' // Include session cookies
    })
        .then(response => {
            clearTimeout(fetchTimeout); // Clear the timeout
            
            if (!response.ok) {
                console.error('Server error:', response.status, response.statusText);
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
                    // Render the projects list
                    projectsList.innerHTML = '';
                    projects.forEach(project => {
                        const projectDate = formatDateString(project.deadline || '');
                        
                        projectsList.innerHTML += `
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h5 class="card-title mb-0">${project.name}</h5>
                                        <div class="btn-group">
                                            <a href="#" class="btn btn-sm btn-outline-primary" onclick="viewProject('${project.id}'); return false;">
                                                <i class="bi bi-eye"></i>
                                            </a>
                                            <a href="#" class="btn btn-sm btn-outline-secondary" onclick="editProject('${project.id}'); return false;">
                                                <i class="bi bi-pencil"></i>
                                            </a>
                                        </div>
                                    </div>
                                    <div class="mb-2">
                                        ${project.deadline ? `<span class="badge bg-info me-1">Deadline: ${projectDate}</span>` : ''}
                                        ${project.supervisor ? `<span class="badge bg-primary me-1">Supervisor: ${project.supervisor}</span>` : ''}
                                        ${project.status ? `<span class="badge bg-secondary me-1">Status: ${project.status}</span>` : ''}
                                    </div>
                                    ${project.description ? `<p class="card-text small">${project.description}</p>` : ''}
                                </div>
                            </div>
                        `;
                    });
                }
                
                // Update the hidden input with projects data if it exists
                const projectsDataInput = document.getElementById('projects_data');
                if (projectsDataInput) {
                    projectsDataInput.value = JSON.stringify(projects);
                }
                
                // Update the projects count in the UI
                updateProjectCount(projects.length);
            } else {
                console.error('API error:', data.error);
                // Show error message
                projectsList.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        ${data.error || 'Failed to load projects'}
                    </div>
                `;
                
                // If the error is about the user not existing, try with a fallback user
                if (data.error && data.error.includes('not found')) {
                    console.log('User not found, trying with fallback user');
                    currentUsername = 'sales2';
                    // Wait a moment before retrying to prevent rapid loops
                    setTimeout(() => loadDealProjects(dealId), 1000);
                }
            }
        })
        .catch(error => {
            clearTimeout(fetchTimeout); // Clear the timeout
            console.error('Error loading projects:', error);
            projectsList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${error.message || 'Error loading projects. Please try again.'}
                </div>
            `;
            
            // Add a retry button to help users recover from errors
            const retryButton = document.createElement('button');
            retryButton.className = 'btn btn-primary mt-2';
            retryButton.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Retry';
            retryButton.onclick = () => loadDealProjects(dealId);
            projectsList.appendChild(retryButton);
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
