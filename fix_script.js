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
    document.getElementById('new_project_deadline').min = today;
    
    // Show the form and enable required attributes
    const form = document.getElementById('addProjectForm');
    form.classList.remove('d-none');
    
    // Make fields required when form is shown
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.hasAttribute('data-required')) {
            el.setAttribute('required', '');
        }
    });
}
