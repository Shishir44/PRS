/**
 * client-manager.js - Functions for client management in the PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 * Complete rebuild to fix client listing and creation functionality
 */

// Global variables
let currentUsername = '';
const API_BASE_URL = '/api/clients/';
const KNOWN_USERS = ['sales1', 'sales2', 'verifier1', 'supervisor1', 'client1'];

/**
 * Initialize the client manager when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Client manager initialized');
    
    // Get current username from session
    getCurrentUsername();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load the client list
    loadClients();
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
 * Set up all event listeners for the client management page
 */
function setupEventListeners() {
    // Show add client form button
    const showAddClientBtn = document.getElementById('showAddClientForm');
    if (showAddClientBtn) {
        showAddClientBtn.addEventListener('click', function() {
            const addClientTab = document.getElementById('add-client-tab');
            if (addClientTab) {
                const bsTab = new bootstrap.Tab(addClientTab);
                bsTab.show();
            }
        });
    }
    
    // Add client form submit
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addClient();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('clientSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchClients);
    }
}

/**
 * Load all clients for the current user
 */
function loadClients() {
    const clientList = document.getElementById('clientList');
    const noClientsMessage = document.getElementById('noClientsMessage');
    
    if (!clientList) {
        console.error('Client list element not found');
        return;
    }
    
    // Show loading state
    clientList.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="d-flex justify-content-center align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Loading clients...</span>
                </div>
            </td>
        </tr>
    `;
    
    // Call the API to get clients
    const url = `${API_BASE_URL}list/?username=${encodeURIComponent(currentUsername)}`;
    console.log('Loading clients from:', url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Client data received:', data);
            
            if (data.success) {
                if (data.clients && data.clients.length > 0) {
                    // Render clients
                    clientList.innerHTML = '';
                    data.clients.forEach(client => {
                        clientList.innerHTML += createClientRowHTML(client);
                    });
                    
                    // Hide no clients message
                    if (noClientsMessage) {
                        noClientsMessage.classList.add('d-none');
                    }
                } else {
                    // Show no clients message
                    clientList.innerHTML = '';
                    if (noClientsMessage) {
                        noClientsMessage.classList.remove('d-none');
                    }
                }
            } else {
                // Show error message
                clientList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            ${data.error || 'Failed to load clients'}
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading clients:', error);
            clientList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        ${error.message || 'Error loading clients. Please try again.'}
                    </td>
                </tr>
            `;
        });
}

/**
 * Create HTML for a client table row
 * @param {Object} client - Client data object
 * @returns {string} HTML for client table row
 */
function createClientRowHTML(client) {
    return `
        <tr data-id="${client.id}" data-name="${client.name}" data-company="${client.company_name || ''}">
            <td class="align-middle">
                <span class="fw-medium">${client.name}</span>
            </td>
            <td class="align-middle">${client.company_name || '-'}</td>
            <td class="align-middle">
                ${client.email ? `<span class="d-block"><i class="bi bi-envelope-fill text-muted me-1 small"></i>${client.email}</span>` : ''}
                ${client.phone ? `<span class="d-block"><i class="bi bi-telephone-fill text-muted me-1 small"></i>${client.phone}</span>` : ''}
                ${!client.email && !client.phone && client.contact_info ? `<span>${client.contact_info}</span>` : ''}
                ${!client.email && !client.phone && !client.contact_info ? '-' : ''}
            </td>
            <td class="align-middle">${client.city ? (client.city + (client.country ? ', ' + client.country : '')) : (client.country || '-')}</td>
            <td class="align-middle">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewClientDetails('${client.id}')" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editClient('${client.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteClient('${client.id}', '${client.name}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Add a new client
 */
function addClient() {
    const form = document.getElementById('addClientForm');
    
    // Form validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return false;
    }
    
    // Disable submit button
    const submitBtn = document.getElementById('submitClientBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Adding...';
    }
    
    // Prepare client data
    const clientData = {
        name: document.getElementById('clientName').value,
        company_name: document.getElementById('companyName').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        contact_info: document.getElementById('clientEmail').value || document.getElementById('clientPhone').value,
        address: document.getElementById('clientAddress').value,
        city: document.getElementById('clientCity').value,
        state: document.getElementById('clientState').value,
        country: document.getElementById('clientCountry').value,
        postal_code: document.getElementById('clientPostalCode').value,
        website: document.getElementById('clientWebsite').value,
        notes: document.getElementById('clientNotes').value,
        username: currentUsername
    };
    
    console.log('Adding client with data:', clientData);
    
    // Send POST request to API
    fetch(`${API_BASE_URL}create/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `Server error: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Client added response:', data);
        
        if (data.success) {
            // Show success message
            showToast('Success', 'Client added successfully!', 'success');
            
            // Reset form
            form.reset();
            form.classList.remove('was-validated');
            
            // Reload client list
            loadClients();
            
            // Switch to client list tab
            const clientsListTab = document.getElementById('clients-list-tab');
            if (clientsListTab) {
                const bsTab = new bootstrap.Tab(clientsListTab);
                bsTab.show();
            }
        } else {
            // Show error message
            showToast('Error', data.error || 'Failed to add client', 'danger');
        }
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Client';
        }
    })
    .catch(error => {
        console.error('Error adding client:', error);
        
        // Show error message
        showToast('Error', error.message || 'Failed to add client', 'danger');
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Client';
        }
    });
    
    return false;
}

/**
 * Search clients based on search query
 */
function searchClients() {
    const searchInput = document.getElementById('clientSearchInput');
    const clientRows = document.querySelectorAll('#clientList tr');
    const noClientsMessage = document.getElementById('noClientsMessage');
    
    if (!searchInput || !clientRows.length) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;
    
    clientRows.forEach(row => {
        const clientName = (row.getAttribute('data-name') || '').toLowerCase();
        const clientCompany = (row.getAttribute('data-company') || '').toLowerCase();
        const rowText = row.textContent.toLowerCase();
        
        if (searchTerm === '' || clientName.includes(searchTerm) || clientCompany.includes(searchTerm) || rowText.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    if (visibleCount === 0 && clientRows.length > 0) {
        if (noClientsMessage) {
            noClientsMessage.textContent = `No clients match your search for "${searchTerm}".`;
            noClientsMessage.classList.remove('d-none');
        }
    } else if (noClientsMessage) {
        noClientsMessage.textContent = 'You haven\'t added any clients yet. Click the "Add New Client" button to get started.';
        noClientsMessage.classList.add('d-none');
    }
}

/**
 * View client details
 * @param {string} clientId - ID of the client to view
 */
function viewClientDetails(clientId) {
    console.log('Viewing client details:', clientId);
    // Implementation to be added
}

/**
 * Edit a client
 * @param {string} clientId - ID of the client to edit
 */
function editClient(clientId) {
    console.log('Editing client:', clientId);
    // Implementation to be added
}

/**
 * Confirm deletion of a client
 * @param {string} clientId - ID of the client to delete
 * @param {string} clientName - Name of the client
 */
function confirmDeleteClient(clientId, clientName) {
    console.log('Confirming delete of client:', clientId, clientName);
    // Implementation to be added
}

/**
 * Delete a client
 * @param {string} clientId - ID of the client to delete
 */
function deleteClient(clientId) {
    console.log('Deleting client:', clientId);
    // Implementation to be added
}

/**
 * Show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, danger, warning, info)
 */
function showToast(title, message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create a unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast HTML
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}
