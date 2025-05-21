/**
 * form-utils.js - Reusable form utility functions for PRS system
 * Follows function-first approach where all UI interactions are implemented as functions
 */

/**
 * Function to handle moving between form steps
 * @param {number} currentStep - The current step number
 */
function nextFormStep(currentStep) {
    // Validate current section
    const currentSection = document.getElementById('section' + currentStep);
    const inputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        alert('Please fill out all required fields before proceeding.');
        return;
    }
    
    // Hide current section, show next section
    document.getElementById('section' + currentStep).style.display = 'none';
    document.getElementById('section' + (currentStep + 1)).style.display = 'block';
    
    // Update progress indicator
    document.getElementById('current_step').value = currentStep + 1;
    updateFormProgress(currentStep + 1);
    
    // Show/hide buttons
    document.getElementById('prevStepBtn').style.display = 'block';
    if (currentStep + 1 === 3) {
        document.getElementById('createDealBtn').style.display = 'block';
    }
}

/**
 * Function to go back to previous form step
 */
function prevFormStep() {
    const currentStep = parseInt(document.getElementById('current_step').value);
    if (currentStep > 1) {
        // Hide current section, show previous section
        document.getElementById('section' + currentStep).style.display = 'none';
        document.getElementById('section' + (currentStep - 1)).style.display = 'block';
        
        // Update progress indicator
        document.getElementById('current_step').value = currentStep - 1;
        updateFormProgress(currentStep - 1);
        
        // Show/hide buttons
        if (currentStep - 1 === 1) {
            document.getElementById('prevStepBtn').style.display = 'none';
        }
        if (currentStep === 3) {
            document.getElementById('createDealBtn').style.display = 'none';
        }
    }
}

/**
 * Function to update the form progress indicator
 * @param {number} step - The current step number
 */
function updateFormProgress(step) {
    // Update progress bar
    const progressBar = document.getElementById('dealFormProgress');
    if (progressBar) {
        const stepCount = 3; // Total number of steps
        const progressPercent = Math.round((step / stepCount) * 100);
        progressBar.style.width = progressPercent + '%';
        progressBar.setAttribute('aria-valuenow', progressPercent);
    }
    
    // Update step indicators
    const stepIndicators = document.querySelectorAll('.step-indicator');
    stepIndicators.forEach((indicator, index) => {
        const stepIcon = indicator.querySelector('.step-icon');
        if (index + 1 === step) {
            indicator.classList.add('active');
            stepIcon.classList.remove('bg-light', 'text-muted');
            stepIcon.classList.add('bg-primary', 'text-white');
        } else if (index + 1 < step) {
            indicator.classList.add('completed');
            stepIcon.classList.remove('bg-light', 'text-muted');
            stepIcon.classList.add('bg-success', 'text-white');
        } else {
            indicator.classList.remove('active', 'completed');
            stepIcon.classList.remove('bg-primary', 'bg-success', 'text-white');
            stepIcon.classList.add('bg-light', 'text-muted');
        }
    });
    
    // Show/hide action buttons based on current step
    const prevBtn = document.getElementById('prevStepBtn');
    const actionButtons = document.getElementById('dealActionButtons');
    
    if (prevBtn) prevBtn.style.display = step > 1 ? '' : 'none';
    if (actionButtons) actionButtons.style.display = step === 3 ? '' : 'none';
}
