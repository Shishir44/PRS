/**
 * client-manager.js - Functions for client management in the PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 */

// Make sure currentUsername is accessible, even if it hasn't been set yet in window
let currentUsername = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Client manager loaded, checking for username');
    
    // Try to get username from window object (set in base.html)
    if (window.currentUsername) {
        currentUsername = window.currentUsername;
        console.log('Found username in window object:', currentUsername);
    }
    // Fallback: try to get from session via meta tag or browser storage
    else {
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
    
    // Initialize the page with our username
    if (currentUsername) {
        console.log('Initializing client manager with username:', currentUsername);
        loadClients();
    } else {
        console.error('Could not determine current username');
        showUsernameError();
    }
});

function showUsernameError() {
    const clientList = document.getElementById('clientList');
    if (clientList) {
        clientList.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error: User information is missing. Please try logging out and back in.
                </td>
            </tr>
        `;
    }
}

/**
 * Function to load all clients for the current user
 */
function loadClients() {
    const clientList = document.getElementById('clientList');
    const noClientsMessage = document.getElementById('noClientsMessage');
    
    if (!clientList) return;
    
    // Check if username is available
    if (!currentUsername) {
        console.error('Error: currentUsername is not defined');
        clientList.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error: User information is missing. Please try logging out and back in.
                </td>
            </tr>
        `;
        return;
    }
    
    // Show loading state - with smaller spinner and inline with text
    clientList.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="d-flex justify-content-center align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>Loading clients...</span>
                </div>
            </td>
        </tr>
    `;
    
    // Fetch clients from the API
    console.log('loadClients called. Using username:', currentUsername);
    fetch(`/api/clients/list/?username=${encodeURIComponent(currentUsername)}`)
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error loading clients - Server responded with non-OK status:', response.status, errorText);
                // Display error to user in the table
                clientList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Error: ${response.status} - Could not load clients. Check console for details.
                        </td>
                    </tr>
                `;
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                if (data.clients && data.clients.length > 0) {
                    // Render clients in the table
                    clientList.innerHTML = '';
                    data.clients.forEach(client => {
                        clientList.innerHTML += createClientRowHtml(client);
                    });
                    
                    // Hide no clients message if visible
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
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            ${data.error || 'Error loading clients. Please try again.'}
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
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Network error. Please check your connection and try again.
                    </td>
                </tr>
            `;
        });
}

/**
 * Helper function to create HTML for a client table row
 * @param {Object} client - Client data object
 * @returns {string} HTML for the table row
 */
function createClientRowHtml(client) {
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
 * Function to search clients based on search query
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
        // There are rows but none match the search
        if (noClientsMessage) {
            noClientsMessage.textContent = `No clients match your search for "${searchTerm}".`;
            noClientsMessage.classList.remove('d-none');
        }
    } else if (noClientsMessage) {
        noClientsMessage.classList.add('d-none');
    }
}

/**
 * Function to add a new client
 * @param {Event} event - Form submission event
 * @returns {boolean} Always false to prevent form submission
 */
function addClient(event) {
    event.preventDefault();
    
    const form = document.getElementById('addClientForm');
    
    // Form validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return false;
    }
    
    // Disable the submit button during the request
    const submitBtn = document.getElementById('submitClientBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Adding...';
    
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
        username: currentUsername  // Using our currentUsername variable
    };
    
    // Send request to create client
    console.log('addClient called. Submitting clientData with username:', clientData.username);
    fetch('/api/clients/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error adding client - Server responded with non-OK status:', response.status, errorText);
            // Re-enable button and show toast
            const submitBtn = document.getElementById('submitClientBtn');
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Client';
            }
            showToast('Error', `Failed to add client: ${response.status}. Check console.`, 'danger');
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Show success message
            showToast('Success', 'Client added successfully!', 'success');
            
            // Reset form
            form.reset();
            form.classList.remove('was-validated');
            
            // Reload clients list to show the new client
            loadClients();
            
            // Switch to the clients list tab
            const clientsListTab = document.getElementById('clients-list-tab');
            if (clientsListTab) {
                const bsTab = new bootstrap.Tab(clientsListTab);
                bsTab.show();
            }
        } else {
            // Show error message
            showToast('Error', data.error || 'Error adding client', 'danger');
        }
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Client';
    })
    .catch(error => {
        console.error('Error in client add request:', error);
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Add Client';
    });
    
    return false;
}

/**
 * Function to view client details
 * @param {string} clientId - ID of the client to view
 */
function viewClientDetails(clientId) {
    // Implementation of viewing client details
    console.log("Viewing client details for ID:", clientId);
    // Additional implementation as needed
}

/**
 * Function to populate the edit client form
 * @param {string} clientId - ID of the client to edit
 */
function editClient(clientId) {
    // Implementation of editing client
    console.log("Editing client with ID:", clientId);
    // Additional implementation as needed
}

/**
 * Function to update client information
 */
function updateClient() {
    // Implementation of updating client
    console.log("Updating client");
    // Additional implementation as needed
}

/**
 * Function to show confirmation before deleting a client
 * @param {string} clientId - ID of the client to delete
 * @param {string} clientName - Name of the client (for display)
 */
function confirmDeleteClient(clientId, clientName) {
    // Implementation of confirming client deletion
    console.log("Confirming deletion of client:", clientName, "with ID:", clientId);
    // Additional implementation as needed
}

/**
 * Function to delete a client
 * @param {string} clientId - ID of the client to delete
 */
function deleteClient(clientId) {
    // Implementation of deleting client
    console.log("Deleting client with ID:", clientId);
    // Additional implementation as needed
}

/**
 * Helper function to show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, danger, warning, info)
 */
function showToast(title, message, type = 'info') {
    // Implementation of showing toast notification
    console.log(`${type.toUpperCase()} Toast: ${title} - ${message}`);
    // Additional implementation as needed
}

// Note: The remaining event listeners and initialization code would be here
