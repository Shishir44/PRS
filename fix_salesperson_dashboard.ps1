# Fix script for salesperson dashboard
# This script replaces the problematic JavaScript code with properly formatted code

$fixedToggleProjectsSection = @'
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
'@

# Create a temporary file
$tempFile = [System.IO.Path]::GetTempFileName()

# Read the original file and store its content
$originalContent = Get-Content -Path "C:\Users\samip\OneDrive\Desktop\In-house\PRS\templates\salesperson_dashboard.html" -Raw

# Find the pattern to replace - the problematic toggle function
$patternToReplace = '(?s)/\*\*\s*\*\s*Function\s*to\s*toggle\s*the\s*projects\s*section.*?showAddProjectForm\(\)(?:;\\n\s*}\s*\\n\s*}|;.*?}\s*})'

# Replace with our fixed version
$newContent = $originalContent -replace $patternToReplace, $fixedToggleProjectsSection

# Write to a temporary file first
Set-Content -Path $tempFile -Value $newContent

# If successful, copy to the real file
Copy-Item -Path $tempFile -Destination "C:\Users\samip\OneDrive\Desktop\In-house\PRS\templates\salesperson_dashboard.html" -Force

# Clean up
Remove-Item -Path $tempFile

Write-Host "Fixed salesperson dashboard JavaScript syntax issues!"
