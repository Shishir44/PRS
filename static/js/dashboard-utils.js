/**
 * dashboard-utils.js - Utility functions for the PRS dashboard
 * Follows function-first approach where all UI interactions are implemented as functions
 */

// Global variables for tracking state
let currentDealId = null;
let currentDealData = null;

/**
 * Function to view deal details - follows function-first approach
 * @param {string} dealId - ID of the deal to view
 */
function viewDealDetails(dealId) {
    // Store current deal ID for other functions to reference
    currentDealId = dealId;
    
    // Create loading content
    const loadingContent = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        <p class="text-center mt-3">Loading deal details...</p>
    `;
    
    // Update modal and show it
    document.getElementById('dealDetailsContent').innerHTML = loadingContent;
    const dealDetailsModal = new bootstrap.Modal(document.getElementById('dealDetailsModal'));
    dealDetailsModal.show();
    
    // Fetch deal data and display it
    fetchDealData(dealId);
}

/**
 * Helper function to fetch deal data
 * @param {string} dealId - ID of the deal to fetch
 */
function fetchDealData(dealId) {
    fetch(`/api/deals/${dealId}/`)
        .then(response => {
            if (!response.ok) {
                // If single deal fetch fails, try getting all deals
                return fetch(`/api/deals/?username=${document.getElementById('username').value}&role=${document.getElementById('role').value}&status=all`);
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Process the deal data
            processDealData(data, dealId);
        })
        .catch(error => {
            console.error('Error fetching deal:', error);
            showDealError(error.message);
        });
}

/**
 * Helper function to process deal data
 * @param {Object} data - Deal data from API
 * @param {string} dealId - ID of the deal to process
 */
function processDealData(data, dealId) {
    let deal = null;
    
    // Check response format and extract deal
    if (data.deal) {
        // Direct deal response
        deal = data.deal;
    } else if (data.success && data.deals && Array.isArray(data.deals)) {
        // List response - find the matching deal
        deal = findDealInList(data.deals, dealId);
    } else {
        throw new Error('Invalid response format or API error');
    }
    
    // If deal found, render it
    if (deal) {
        renderDealDetails(deal);
    } else {
        showDealError('Deal not found');
    }
}

/**
 * Helper function to find a deal in a list
 * @param {Array} deals - List of deals
 * @param {string} dealId - ID to look for
 * @returns {Object|null} The matching deal or null
 */
function findDealInList(deals, dealId) {
    // Try exact match
    let deal = deals.find(d => d.id === dealId);
    
    // Try string comparison
    if (!deal) {
        deal = deals.find(d => String(d.id) === String(dealId));
    }
    
    // Last resort comparison
    if (!deal) {
        deal = deals.find(d => {
            if (!d.id) return false;
            return d.id.toString() === dealId.toString();
        });
    }
    
    return deal;
}

/**
 * Function to show deal error message
 * @param {string} message - Error message to display
 */
function showDealError(message) {
    document.getElementById('dealDetailsContent').innerHTML = `
        <div class="alert alert-danger">
            <h5>Error Loading Deal</h5>
            <p>${message}</p>
            <button class="btn btn-primary mt-2" onclick="window.location.reload()">Refresh Page</button>
        </div>
    `;
}

/**
 * Function to render deal details in the modal
 * @param {Object} deal - Deal object to render
 */
function renderDealDetails(deal) {
    console.log('Found matching deal:', deal);
    currentDealData = deal;
    
    // Format the deal date
    const dealDate = new Date(deal.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create status badge
    let statusBadge = '';
    if (deal.status === 'draft') {
        statusBadge = '<span class="badge bg-secondary">Draft</span>';
    } else if (deal.status === 'pending_verification') {
        statusBadge = '<span class="badge bg-warning text-dark">Pending Verification</span>';
    } else if (deal.status === 'verified') {
        statusBadge = '<span class="badge bg-success">Verified</span>';
    } else if (deal.status === 'rejected') {
        statusBadge = '<span class="badge bg-danger">Rejected</span>';
    } else {
        statusBadge = `<span class="badge bg-info">${deal.status}</span>`;
    }
    
    // Build HTML for deal details
    const dealHtml = `
        <div class="card mb-4">
            <div class="card-header bg-primary bg-opacity-10">
                <h5 class="mb-0">${deal.title}</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Client:</strong> ${deal.client_name}</p>
                        <p><strong>Budget:</strong> $${deal.budget}</p>
                        <p><strong>Status:</strong> ${statusBadge}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Created:</strong> ${dealDate}</p>
                        <p><strong>Created By:</strong> ${deal.created_by}</p>
                        <p><strong>Type:</strong> ${deal.is_multiproject ? 'Multiple Projects' : 'Single Project'}</p>
                    </div>
                </div>
                
                <hr>
                
                <h6>Description</h6>
                <p>${deal.description || 'No description provided.'}</p>
                
                <div class="mt-4 d-flex justify-content-end">
                    ${getActionButtonsForDeal(deal)}
                </div>
            </div>
        </div>
        
        ${deal.projects && deal.projects.length > 0 ? renderDealProjects(deal.projects) : ''}
    `;
    
    document.getElementById('dealDetailsContent').innerHTML = dealHtml;
}

/**
 * Helper function to get action buttons for a deal based on its status
 * @param {Object} deal - Deal object
 * @returns {string} HTML for action buttons
 */
function getActionButtonsForDeal(deal) {
    if (deal.status === 'draft') {
        return `
            <button class="btn btn-warning me-2" onclick="editDeal('${deal.id}')">
                <i class="bi bi-pencil me-1"></i> Edit
            </button>
            <button class="btn btn-success me-2" onclick="submitDealForVerification('${deal.id}')">
                <i class="bi bi-check-circle me-1"></i> Submit for Verification
            </button>
            <button class="btn btn-danger" onclick="deleteDeal('${deal.id}')">
                <i class="bi bi-trash me-1"></i> Delete
            </button>
        `;
    } else if (deal.status === 'rejected') {
        return `
            <button class="btn btn-warning me-2" onclick="editDeal('${deal.id}')">
                <i class="bi bi-pencil me-1"></i> Edit
            </button>
            <button class="btn btn-success me-2" onclick="submitDealForVerification('${deal.id}')">
                <i class="bi bi-check-circle me-1"></i> Resubmit
            </button>
            <button class="btn btn-danger" onclick="deleteDeal('${deal.id}')">
                <i class="bi bi-trash me-1"></i> Delete
            </button>
        `;
    } else if (deal.status === 'verified') {
        return `
            <button class="btn btn-primary" onclick="manageProjects('${deal.id}')">
                <i class="bi bi-folder me-1"></i> Manage Projects
            </button>
        `;
    } else {
        return ''; // No actions for deals in other states
    }
}

/**
 * Helper function to render projects for a deal
 * @param {Array} projects - Array of project objects
 * @returns {string} HTML for projects section
 */
function renderDealProjects(projects) {
    if (!projects || projects.length === 0) {
        return '';
    }
    
    let projectsHtml = `
        <div class="card mb-3">
            <div class="card-header bg-success bg-opacity-10">
                <h5 class="mb-0">Projects (${projects.length})</h5>
            </div>
            <div class="card-body">
                <div class="list-group">
    `;
    
    projects.forEach(project => {
        const deadline = project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline';
        
        projectsHtml += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${project.name}</h5>
                    <small>Deadline: ${deadline}</small>
                </div>
                <p class="mb-1">Supervisor: ${project.supervisor || 'Not assigned'}</p>
                ${project.description ? `<p class="mb-1">${project.description}</p>` : ''}
            </div>
        `;
    });
    
    projectsHtml += `
                </div>
            </div>
        </div>
    `;
    
    return projectsHtml;
}

/**
 * Function to initialize the dashboard
 */
function initializeDashboard() {
    // Set up event listeners and initial state
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize tabs
        const dealTab = document.getElementById('deals-tab');
        const projectTab = document.getElementById('projects-tab');
        
        if (dealTab) {
            dealTab.addEventListener('click', function() {
                // Update URL hash to track tab
                window.location.hash = 'deals';
            });
        }
        
        if (projectTab) {
            projectTab.addEventListener('click', function() {
                // Update URL hash to track tab
                window.location.hash = 'projects';
                // Load projects when tab is clicked
                loadProjects();
            });
        }
        
        // Check hash for tab to activate
        if (window.location.hash === '#projects') {
            projectTab.click();
        }
    });
}
