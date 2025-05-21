/**
 * deal-manager.js - Functions for deal management in the PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 */

/**
 * Function to initialize the create deal form
 */
function initializeCreateDealForm() {
    // Reset the form
    document.getElementById('createDealForm').reset();
    resetProjectsData();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deal_date').value = today;
    document.getElementById('deal_date').min = today;
    
    // Hide project form and remove required attributes
    toggleAddProjectForm(false);
    
    // Initialize radio buttons (no default checked)
    document.getElementById('single_project').checked = false;
    document.getElementById('multi_project').checked = false;
    
    // Reset form sections visibility
    document.querySelectorAll('.form-section').forEach((section, index) => {
        section.style.display = index === 0 ? 'block' : 'none';
    });
    
    // Reset progress indicators
    document.getElementById('current_step').value = 1;
    updateFormProgress(1);
    
    // Reset buttons
    document.getElementById('prevStepBtn').style.display = 'none';
    document.getElementById('dealActionButtons').style.display = 'none';
    
    // Reset status to draft
    document.getElementById('deal_status').value = 'draft';
}

/**
 * Function to reset projects data
 */
function resetProjectsData() {
    document.getElementById('projects_data').value = '[]';
    renderProjectsList([]);
}

/**
 * Function to show the create deal modal
 */
function showCreateDealModal() {
    initializeCreateDealForm();
    const createDealModal = new bootstrap.Modal(document.getElementById('createDealModal'));
    createDealModal.show();
}

/**
 * Function to prepare form data for deal submission
 * @param {boolean} requireProjectValidation - Whether to require project validation
 * @returns {FormData|null} - The prepared FormData or null if validation fails
 */
function prepareFormData(requireProjectValidation = true) {
    const form = document.getElementById('createDealForm');
    
    // Temporarily remove required attribute from hidden fields
    const hiddenRequiredFields = [];
    const projectForm = document.getElementById('addProjectForm');
    if (projectForm && projectForm.classList.contains('d-none')) {
        const fields = projectForm.querySelectorAll('[data-required]');
        fields.forEach(field => {
            hiddenRequiredFields.push(field);
            field.removeAttribute('required');
        });
    }
    
    // Form validation
    if (!form.checkValidity()) {
        form.reportValidity();
        
        // Restore required attributes
        hiddenRequiredFields.forEach(field => {
            field.setAttribute('required', '');
        });
        return null;
    }
    
    // Restore required attributes
    hiddenRequiredFields.forEach(field => {
        field.setAttribute('required', '');
    });
    
    // Handle client selection - prioritize the client_id if available
    const clientId = document.getElementById('client_id');
    const clientManual = document.getElementById('client_name_manual');
    const clientSelect = document.getElementById('clientSelect');
    
    // Create FormData from the form
    const formData = new FormData(form);
    
    // Make sure we're sending the correct client information
    if (clientId && clientId.value) {
        // Using an existing client - ensure client_id is properly set
        formData.set('client_id', clientId.value);
        
        // Get the selected client name from the dropdown for logging/display purposes
        if (clientSelect && clientSelect.selectedIndex > 0) {
            const selectedOption = clientSelect.options[clientSelect.selectedIndex];
            formData.set('client_name', selectedOption.textContent.split(' (')[0]); // Strip the contact info part
        }
        
        // Make sure we're not sending conflicting client information
        if (formData.has('client_name_manual')) {
            formData.delete('client_name_manual');
        }
    } else if (clientManual && clientManual.value && !clientManual.disabled) {
        // Using a new manually entered client
        formData.set('client_name_manual', clientManual.value);
        
        // Ensure client_id is not sent if we're using manual name
        if (formData.has('client_id')) {
            formData.delete('client_id');
        }
    } else {
        // Neither option selected - this should be caught by validation
        console.warn('No client selected or entered');
    }
    
    // Check if it's a multi-project deal
    const isMultiProject = document.getElementById('multi_project')?.checked;
    
    // Get projects data from hidden field
    let projectsData = [];
    try {
        projectsData = JSON.parse(document.getElementById('projects_data').value);
    } catch (e) {
        projectsData = [];
    }
    
    // Project validation
    if (requireProjectValidation && projectsData.length === 0) {
        // If the add project form is visible, try to get data from it and add it
        if (projectForm && !projectForm.classList.contains('d-none')) {
            const projectName = document.getElementById('new_project_name')?.value?.trim();
            const projectSupervisor = document.getElementById('new_project_supervisor')?.value;
            const projectDescription = document.getElementById('new_project_description')?.value?.trim();
            const projectDeadline = document.getElementById('new_project_deadline')?.value;
            
            // If fields are filled out, add this as a project
            if (projectName && projectSupervisor) {
                const newProject = {
                    name: projectName,
                    supervisor: projectSupervisor,
                    description: projectDescription,
                    deadline: projectDeadline,
                    created_by: document.querySelector('input[name="created_by"]').value
                };
                projectsData.push(newProject);
                document.getElementById('projects_data').value = JSON.stringify(projectsData);
            } else if (requireProjectValidation) {
                alert('Please add at least one project to the deal.');
                return null;
            }
        } else if (requireProjectValidation) {
            alert('Please add at least one project to the deal.');
            return null;
        }
    }
    
    // Check if the deal is single-project or multi-project
    if (!isMultiProject && projectsData.length > 1) {
        // For single project deals, only keep the first project
        projectsData = [projectsData[0]];
        document.getElementById('projects_data').value = JSON.stringify(projectsData);
    }
    
    // Update form data with latest projects data
    formData.set('projects_data', document.getElementById('projects_data').value);
    
    return formData;
}

/**
 * Function to submit deal data to the server
 * @param {FormData} formData - The form data to submit
 * @param {HTMLElement} submitBtn - The button that triggered the submission
 * @param {string} successMessage - Message to show on success
 */
function submitDealData(formData, submitBtn, successMessage) {
    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    submitBtn.disabled = true;
    
    // Submit form data
    fetch('/api/deals/create/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(successMessage + (data.projects && data.projects.length > 0 ? ' ' + data.projects.length + ' projects were also created.' : ''));
            window.location.reload();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while creating the deal.');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}

/**
 * Function to save a deal as draft
 * Less strict validation - no project required
 */
function saveDealAsDraft() {
    // Set status to draft
    document.getElementById('deal_status').value = 'draft';
    
    // Prepare form data without project validation
    const formData = prepareFormData(false);
    if (!formData) return; // Validation failed
    
    // Submit the draft
    const submitBtn = document.getElementById('saveDraftBtn');
    submitDealData(formData, submitBtn, 'Deal saved as draft! You can edit it later before submitting for verification.');
}

/**
 * Function to submit a deal for verification
 * Requires complete validation including projects
 */
function submitDealForVerification() {
    // Set status to pending_verification
    document.getElementById('deal_status').value = 'pending_verification';
    
    // Prepare form data with full validation
    const formData = prepareFormData(true);
    if (!formData) return; // Validation failed
    
    // Submit for verification
    const submitBtn = document.getElementById('submitDealBtn');
    submitDealData(formData, submitBtn, 'Deal submitted for verification! A verifier will review it soon.');
}

/**
 * Function to create a new deal with project data
 * @deprecated Use saveDealAsDraft or submitDealForVerification instead
 */
function createDeal() {
    // For backward compatibility, submit as draft
    saveDealAsDraft();
}

/**
 * Function to filter deals by status
 * @param {string} status - Status to filter by (all, draft, pending_verification, verified, rejected)
 */
function filterDeals(status) {
    const tableRows = document.querySelectorAll('#dealsTableBody tr');
    const statusBadge = document.getElementById('currentStatusFilter');
    
    tableRows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (status === 'all' || rowStatus === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update status filter badge
    let statusText = 'All Deals';
    let badgeClass = 'bg-primary';
    
    if (status === 'draft') {
        statusText = 'Draft Deals';
        badgeClass = 'bg-secondary';
    } else if (status === 'pending_verification') {
        statusText = 'Pending Verification';
        badgeClass = 'bg-warning text-dark';
    } else if (status === 'verified') {
        statusText = 'Verified Deals';
        badgeClass = 'bg-success';
    } else if (status === 'rejected') {
        statusText = 'Rejected Deals';
        badgeClass = 'bg-danger';
    }
    
    if (statusBadge) {
        statusBadge.textContent = statusText;
        statusBadge.className = `badge ${badgeClass}`;
    }
    
    // Update count of visible deals
    updateVisibleDealsCount();
}

/**
 * Function to search deals based on search input
 * @param {string} searchText - Text to search for
 */
function searchDeals(searchText) {
    const tableRows = document.querySelectorAll('#dealsTableBody tr');
    const searchLower = searchText.toLowerCase();
    
    tableRows.forEach(row => {
        const dealText = row.textContent.toLowerCase();
        // Don't hide rows that have been filtered by status
        if (row.style.display !== 'none' && searchLower) {
            row.style.display = dealText.includes(searchLower) ? '' : 'none';
        } else if (!searchLower) {
            // If search is cleared, show rows (unless filtered by status)
            if (row.style.display === 'none') {
                // Check if it was hidden by status filter
                const status = document.getElementById('currentStatusFilter')?.textContent;
                const rowStatus = row.getAttribute('data-status');
                
                if (status === 'All Deals' || 
                    (status === 'Draft Deals' && rowStatus === 'draft') ||
                    (status === 'Pending Verification' && rowStatus === 'pending_verification') ||
                    (status === 'Verified Deals' && rowStatus === 'verified') ||
                    (status === 'Rejected Deals' && rowStatus === 'rejected')) {
                    row.style.display = '';
                }
            }
        }
    });
    
    // Update count of visible deals
    updateVisibleDealsCount();
}

/**
 * Function to update the visible deals count
 */
function updateVisibleDealsCount() {
    const visibleDeals = document.querySelectorAll('#dealsTableBody tr[style=""]').length;
    const totalDealsCount = document.getElementById('totalDealsCount');
    if (totalDealsCount) {
        totalDealsCount.textContent = visibleDeals;
    }
}
