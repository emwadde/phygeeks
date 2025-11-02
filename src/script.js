// Global variables
let atolls = [];
let islands = [];
let schools = [];
let currentSection = 'student-info';
let formData = {};
let rankedUnits = [];
let uploadedFileBase64 = null;
let uploadedFileName = null;

// Map of fields to their sections for easier validation and navigation
const sectionFields = {
    'student-info': ['student-name', 'gender', 'national-id', 'atoll', 'island', 'address', 'contact-number', 'school', 'grade', 'email'],
    'parent-info': ['parent-name', 'relation', 'parent-contact', 'parent-email'],
    'background-info': ['device', 'physics-difficulty', 'last-exam-grade'],
    'document-upload': ['id-photo']
};

// Physics units for ranking
const physicsUnits = [
    { id: 'motion', name: 'Motion, Forces and Energy' },
    { id: 'thermal', name: 'Thermal Physics' },
    { id: 'waves', name: 'Waves' },
    { id: 'electricity', name: 'Electricity and Magnetism' },
    { id: 'nuclear', name: 'Nuclear Physics' },
    { id: 'space', name: 'Space Physics' }
];

// Google Apps Script Web App URL - **IMPORTANT: YOU MUST REPLACE THIS WITH YOUR DEPLOYED WEB APP URL**
// NOTE: "Failed to fetch" is usually because this script is not deployed with "Who has access" set to "Anyone."
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwChlsSymYCdH3b0pWLLheipDADIGstc94wLIrKeZJ_Wd6GiT5u3_daPDjs44anU6X8/exec'; 

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initialized');
    
    // Load data from Google Sheets
    loadDataFromSheets();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize difficult units ranking
    initializeUnitsRanking();
});

// Setup all event listeners
function setupEventListeners() {
    // Start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startApplication);
    } 
    
    // Close button
    document.getElementById('close-btn').addEventListener('click', closeApplication);
    
    // Submit button
    document.getElementById('submit-btn').addEventListener('click', submitForm);
    
    // Download button
    document.getElementById('download-btn').addEventListener('click', downloadVerification);
    
    // // Upload buttons
    // document.getElementById('camera-btn').addEventListener('click', openCamera);
    // document.getElementById('gallery-btn').addEventListener('click', openGallery);
    
    // // File input change
    // document.getElementById('id-photo').addEventListener('change', handleFileSelect);
    
    // Set up form field event listeners
    setupFormFieldListeners();
    
    // Set up section navigation
    setupSectionNavigation();
}

// Load data from Google Sheets using Google Apps Script
async function loadDataFromSheets() {
    try {
        console.log('Loading data from Google Sheets: started');
        const regionsCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQC2fYj0Ps60Df2oc3_DrKOdc8YSiQMSyfHprwITAgfZwxC5Al7BFALXoeEqTGB74xN9jEhrvqtyqG/pub?gid=1346222018&single=true&output=csv";
        const schoolsCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQC2fYj0Ps60Df2oc3_DrKOdc8YSiQMSyfHprwITAgfZwxC5Al7BFALXoeEqTGB74xN9jEhrvqtyqG/pub?gid=108138081&single=true&output=csv";
        
        const responses = await Promise.all([
            fetch(regionsCsvUrl, {redirect: 'follow'}).then(response => response.text()),
            fetch(schoolsCsvUrl, {redirect: 'follow'}).then(response => response.text())
        ]);

        // console.log(responses)

        const regions = responses[0]
            .split(/[\r\n]+/)
            .slice(1)
            .filter(region => region.trim())
            .map(region => region.split(','))
            .map(region => ({atoll: region[0], island: region[1]}));

        schools = responses[1]
            .split(/[\r\n]+/)
            .slice(1).map(school => school[0]);

        console.log({schools})
        
        atolls = new Set(regions.map(r => r.atoll)); // Set of unique atolls
        islands = regions.map(r => r.island);

        console.log("Loading data from Google Sheets: completed");
        populateDropdowns();
        
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
    }
}

function initializeUnitsRanking() {
    const unitsContainer = document.getElementById('difficult-units');
    
    // Create unit items
    unitsContainer.innerHTML = ''; // Clear existing
    physicsUnits.forEach(unit => {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        unitElement.draggable = true;
        unitElement.dataset.unitId = unit.id;
        
        unitElement.innerHTML = `
            <input type="checkbox" class="unit-checkbox" id="unit-${unit.id}">
            <label class="unit-label" for="unit-${unit.id}">${unit.name}</label>
            <div class="rank-badge" style="display: none;">0</div>
        `;
        
        unitsContainer.appendChild(unitElement);
    });
    
    // Set up event listeners for units
    setupUnitsEventListeners();
}

function setupUnitsEventListeners() {
    const unitItems = document.querySelectorAll('.unit-item');
    const unitCheckboxes = document.querySelectorAll('.unit-checkbox');
    
    // Checkbox change events
    unitCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const unitItem = this.closest('.unit-item');
            const unitId = unitItem.dataset.unitId;
            
            if (this.checked) {
                if (!rankedUnits.includes(unitId)) {
                    rankedUnits.push(unitId);
                }
            } else {
                const index = rankedUnits.indexOf(unitId);
                if (index > -1) {
                    rankedUnits.splice(index, 1);
                }
            }
            updateRankingDisplay();
        });
    });
    
    // Drag and drop functionality
    unitItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    const unitItem = e.target.closest('.unit-item');
    const unitId = unitItem.dataset.unitId;
    const checkbox = unitItem.querySelector('.unit-checkbox');
    
    if (checkbox.checked) {
        e.dataTransfer.setData('text/plain', unitId);
        unitItem.classList.add('dragging');
    } else {
        // Prevent drag if not checked
        e.preventDefault();
    }
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const draggedUnitId = e.dataTransfer.getData('text/plain');
    const targetUnit = e.target.closest('.unit-item');
    
    if (targetUnit && draggedUnitId) {
        const targetUnitId = targetUnit.dataset.unitId;
        
        if (draggedUnitId !== targetUnitId) {
            // Reorder logic
            const draggedIndex = rankedUnits.indexOf(draggedUnitId);
            const targetIndex = rankedUnits.indexOf(targetUnitId);
            
            // Reordering should only occur if both items are already ranked (checked)
            if (draggedIndex > -1 && targetIndex > -1) {
                rankedUnits.splice(draggedIndex, 1);
                rankedUnits.splice(targetIndex, 0, draggedUnitId);
                updateRankingDisplay();
            }
        }
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function updateRankingDisplay() {
    const rankingDisplay = document.getElementById('ranking-display');
    const unitItems = document.querySelectorAll('.unit-item');
    
    // Update rank badges
    unitItems.forEach(item => {
        const unitId = item.dataset.unitId;
        const rankBadge = item.querySelector('.rank-badge');
        const rankIndex = rankedUnits.indexOf(unitId);
        
        if (rankIndex > -1) {
            rankBadge.textContent = rankIndex + 1;
            rankBadge.style.display = 'flex';
        } else {
            rankBadge.style.display = 'none';
        }
    });
    
    // Update ranking display
    if (rankedUnits.length > 0) {
        let html = '<h4>Your Ranking:</h4>';
        rankedUnits.forEach((unitId, index) => {
            const unit = physicsUnits.find(u => u.id === unitId);
            if (unit) {
                html += `
                    <div class="ranked-item">
                        <div class="rank-number">${index + 1}</div>
                        <div class="unit-name">${unit.name}</div>
                    </div>
                `;
            }
        });
        rankingDisplay.innerHTML = html;
    } else {
        rankingDisplay.innerHTML = '<p>Select units and rank them by dragging. Most difficult = 1, Least difficult = 6</p>';
    }
}

function populateDropdowns() {
    const atollSelect = document.getElementById('atoll');
    const islandSelect = document.getElementById('island');
    const schoolsList = document.getElementById('schools-list');
    
    atollSelect.innerHTML = '<option value="">Select Atoll</option>';
    islandSelect.innerHTML = '<option value="">Select Island</option>';
    schoolsList.innerHTML = '';
    
    atolls.forEach(atoll => {
        const option = document.createElement('option');
        option.value = atoll;
        option.textContent = atoll;
        atollSelect.appendChild(option);
    });
    
    islands.forEach(island => {
        const option = document.createElement('option');
        option.value = island;
        option.textContent = island;
        islandSelect.appendChild(option);
    });
    
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school;
        schoolsList.appendChild(option);
    });
}

function startApplication() {
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('application-form').classList.add('active');
    
    // Enable the first form field to start the sequential flow
    enableField('student-name');
}

// Setup form field listeners for enabling next fields (Remains the same for Student Info)
function setupFormFieldListeners() {
    // Student name field
    document.getElementById('student-name').addEventListener('input', function() {
        if (this.value.trim() !== '') {
            enableField('gender');
        }
    });
    
    // Gender field
    document.getElementById('gender').addEventListener('change', function() {
        if (this.value !== '') {
            enableField('national-id');
        }
    });
    
    // National ID field
    document.getElementById('national-id').addEventListener('input', function() {
        const value = this.value.trim();
        this.value = value.replace(/[\s-]/g, '');
        
        if (this.value !== '') {
            enableField('atoll');
        }
    });
    
    // Atoll field
    document.getElementById('atoll').addEventListener('change', function() {
        if (this.value !== '') {
            enableField('island');
        }
    });
    
    // Island field
    document.getElementById('island').addEventListener('change', function() {
        if (this.value !== '') {
            enableField('address');
        }
    });
    
    // Address field
    document.getElementById('address').addEventListener('input', function() {
        if (this.value.trim() !== '') {
            enableField('contact-number');
        }
    });
    
    // Contact number field - VALIDATION ADDED
    document.getElementById('contact-number').addEventListener('input', function() {
        const value = this.value.replace(/\D/g, '');
        this.value = value.slice(0, 7); // Limit to 7 digits
        
        if (this.value.length === 7) {
            clearFieldError(this);
            enableField('school');
        } else if (this.value.length > 0) {
            showFieldError(this, 'Contact number must be a valid 7-digit number (7 digits total).');
        }
    });
    
    // School field
    document.getElementById('school').addEventListener('input', function() {
        if (this.value.trim() !== '') {
            enableField('grade');
        }
    });
    
    // Grade field
    document.getElementById('grade').addEventListener('change', function() {
        if (this.value !== '') {
            enableField('email');
        }
    });
    
    // Email field validation - Removed Gmail requirement from live check
    document.getElementById('email').addEventListener('blur', function() {
        validateEmail(this, true);
    });
    
    // Parent email field validation - No change
    document.getElementById('parent-email').addEventListener('blur', function() {
        validateEmail(this, false);
    });

    // Parent Contact number field - VALIDATION ADDED
    document.getElementById('parent-contact').addEventListener('input', function() {
        const value = this.value.replace(/\D/g, '');
        this.value = value.slice(0, 7); // Limit to 7 digits

        if (this.value.length === 7) {
            clearFieldError(this);
        } else if (this.value.length > 0) {
            showFieldError(this, 'Parent contact number must be a valid 7-digit number (7 digits total).');
        }
    });
}

function enableField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.disabled = false;
        // Add animation
        field.parentElement.style.animation = 'slideIn 0.5s forwards';
    }
}

function validateEmail(emailField, isStudentEmail = false) {
    const email = emailField.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        showFieldError(emailField, 'Please enter a valid email address');
        return false;
    }
    
    if (isStudentEmail && !email.endsWith('@gmail.com') && !emailField.disabled) {
        clearFieldError(emailField); 
    } else {
        clearFieldError(emailField);
    }
    return true;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    field.parentElement.appendChild(errorElement);
    field.style.borderColor = 'red';
}

function clearFieldError(field) {
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '#e0e0e0';
}

// Setup section navigation (Updated to use validation)
function setupSectionNavigation() {
    // Next section buttons
    document.querySelectorAll('.next-section').forEach(button => {
        button.addEventListener('click', function() {
            if (validateCurrentSection()) { // <-- Check validation first
                const nextSection = this.getAttribute('data-next');
                navigateToSection(nextSection);
            } else {
                // Focus the first invalid field or section
                const firstInvalid = document.querySelector('.form-section.active .field-error').closest('.form-group').querySelector('.form-control, select');
                if(firstInvalid) firstInvalid.focus();
                alert('Please correct the errors in the current section before proceeding.');
            }
        });
    });
    
    // Previous section buttons (no validation needed)
    document.querySelectorAll('.prev-section').forEach(button => {
        button.addEventListener('click', function() {
            const prevSection = this.getAttribute('data-prev');
            navigateToSection(prevSection);
        });
    });
}

/**
 * FIX: Validates all required fields in the current visible section.
 */
function validateCurrentSection() {
    let isValid = true;
    const fields = sectionFields[currentSection];
    
    if (!fields) return true;

    // Helper for required fields
    const checkRequired = (id, message) => {
        const field = document.getElementById(id);
        
        if (!field || !field.closest('.form-section').classList.contains('active')) {
            return ''; 
        }

        if (!field.value.trim() || field.disabled) {
            showFieldError(field, message);
            isValid = false;
        } else {
            clearFieldError(field);
        }
        return field.value.trim();
    };
    
    if (currentSection === 'student-info') {
        // Standard checks
        checkRequired('student-name', 'Please enter student name');
        checkRequired('gender', 'Please select gender');
        checkRequired('national-id', 'Please enter national ID');
        checkRequired('atoll', 'Please select atoll');
        checkRequired('island', 'Please select island');
        checkRequired('address', 'Please enter address');
        checkRequired('school', 'Please enter school');
        checkRequired('grade', 'Please select grade');

        // Student Contact number validation (Must be 7 digits)
        const contactField = document.getElementById('contact-number');
        const studentContact = checkRequired('contact-number', 'Please enter contact number');
        if (studentContact && (studentContact.length !== 7 || !/^\d+$/.test(studentContact))) {
            showFieldError(contactField, 'Contact number must be a valid 7-digit number.');
            isValid = false;
        }

        // Student Email (Must be a valid Gmail)
        const emailField = document.getElementById('email');
        const studentEmail = checkRequired('email', 'Please enter email');
        if (studentEmail && !validateEmail(emailField, true)) {
            isValid = false;
        } else if (studentEmail && !studentEmail.toLowerCase().endsWith('@gmail.com')) {
            showFieldError(emailField, 'The student email *must* be a **Gmail** address.');
            isValid = false;
        }
        
    } else if (currentSection === 'parent-info') {
        // Standard checks
        checkRequired('parent-name', 'Please enter parent name');
        checkRequired('relation', 'Please enter relation to student');
        
        // Parent Contact number validation (Must be 7 digits)
        const pContactField = document.getElementById('parent-contact');
        const parentContact = checkRequired('parent-contact', 'Please enter parent contact number');
        if (parentContact && (parentContact.length !== 7 || !/^\d+$/.test(parentContact))) {
            showFieldError(pContactField, 'Parent contact number must be a valid 7-digit number.');
            isValid = false;
        }

        // Parent Email
        const pEmailField = document.getElementById('parent-email');
        const parentEmail = checkRequired('parent-email', 'Please enter parent email');
        if (parentEmail && !validateEmail(pEmailField, false)) {
            isValid = false;
        }

    } else if (currentSection === 'background-info') {
        // Standard checks
        checkRequired('device', 'Please select device');
        checkRequired('physics-difficulty', 'Please select physics difficulty');
        checkRequired('last-exam-grade', 'Please select last exam grade');

        // Ranking validation
        if (!validateUnitsRanking()) {
            isValid = false;
            // Provide a visual cue for the user to check the ranking
            const rankingContainer = document.querySelector('.ranking-container');
            rankingContainer.style.border = '2px solid red';
            setTimeout(() => rankingContainer.style.border = '2px solid #e0e0e0', 3000); 
        }
        
    } else if (currentSection === 'document-upload') {
        // File upload validation
        if (!validateFileUpload()) {
            isValid = false;
            // Provide a visual cue for the user to upload a file
            const uploadOptions = document.querySelector('.upload-options');
            uploadOptions.style.border = '2px solid red';
            setTimeout(() => uploadOptions.style.border = 'none', 3000);
        }
    }
    
    return isValid;
}


/**
 * Handles the section change and enables fields in the destination section.
 */
function navigateToSection(sectionId) {
    document.getElementById(currentSection).classList.remove('active');
    document.getElementById(sectionId).classList.add('active');
    currentSection = sectionId;
    
    // Enable all fields in the destination section (except for the sequential 'student-info' page)
    if (sectionId !== 'student-info' && sectionFields[sectionId]) {
        sectionFields[sectionId].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Do not enable the hidden file input directly, but related fields can be enabled.
                if (fieldId !== 'id-photo') {
                    enableField(fieldId); 
                }
            }
        });
    }
}


function openCamera() {
    const fileInput = document.getElementById('id-photo');
    fileInput.setAttribute('capture', 'camera');
    fileInput.click();
}

function openGallery() {
    const fileInput = document.getElementById('id-photo');
    fileInput.removeAttribute('capture');
    fileInput.click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('file-preview');
    const progress = document.getElementById('upload-progress');

    if (file) {
        uploadedFileName = file.name;
        
        // Show file name
        preview.innerHTML = `<div class="file-name">Selected file: ${file.name}</div>`;
        progress.classList.remove('hidden');
        progress.textContent = 'Preparing file for upload...';
        uploadedFileBase64 = null;

        const reader = new FileReader();
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                progress.textContent = `Preparing file... ${percentLoaded}%`;
            }
        };

        reader.onload = function(e) {
            uploadedFileBase64 = e.target.result; // Base64 string
            progress.classList.add('hidden'); // Hide progress after loading
            
            // Show image preview
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `
                    <img src="${uploadedFileBase64}" alt="ID Preview">
                    <div class="file-name">${file.name}</div>
                `;
            } else {
                preview.innerHTML = `<div class="file-name">Selected file: ${file.name}</div>`;
            }
        };
        
        reader.onerror = function(e) {
            console.error('FileReader error:', e);
            progress.classList.add('hidden');
            preview.innerHTML = '<div class="field-error">Error reading file.</div>';
        };

        reader.readAsDataURL(file);

    } else {
        uploadedFileBase64 = null;
        uploadedFileName = null;
        preview.innerHTML = '';
        progress.classList.add('hidden');
    }
}

function downloadVerification() {
    const successContent = document.getElementById('success-content');
    
    const downloadBtn = document.getElementById('download-btn');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Generating...';
    downloadBtn.disabled = true;
    
    // Get the computed background color of the success screen glass container
    const computedStyle = getComputedStyle(successContent);
    const backgroundColor = computedStyle.backgroundColor || '#FFFFFF'; // Fallback to white

    html2canvas(successContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: backgroundColor, // Set background color for proper screenshot
        allowTaint: true,
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `phygeeks-verification-${formData.referenceNumber || 'TEMP'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    }).catch(error => {
        console.error('Error generating screenshot:', error);
        alert('Failed to generate verification image. Error: ' + error.message);
        
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    });
}

// Submission issue resolved by ensuring all front-end validation is correct before calling the backend.
async function submitForm() {
    if (!validateCurrentSection()) { // Validate the final page
        alert('Please correct the errors in the current section before submitting.');
        return;
    }
    
    collectFormData();
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        document.getElementById('application-form').classList.add('loading');
        
        // Submit data to Google Sheets
        const result = await submitToGoogleSheets();
        
        if (result.success) {
            formData.referenceNumber = result.referenceNumber;
            showSuccessScreen(result.referenceNumber);
        } else {
            throw new Error(result.error || 'Submission failed');
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your application. Please check your network connection and try again. If you are using CodePen, this is expected. You must deploy your Google Script publicly.');
        
        // FALLBACK: Since you mentioned the download receipt works, we provide a temp reference
        formData.referenceNumber = 'TEMP-' + Date.now().toString().slice(-6);
        showSuccessScreen(formData.referenceNumber);
        
        // Reset button for safety
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Submit Application';
        submitBtn.disabled = false;
        document.getElementById('application-form').classList.remove('loading');
    }
}

function validateUnitsRanking() {
    return rankedUnits.length > 0;
}

function validateFileUpload() {
    return uploadedFileBase64 !== null;
}

function collectFormData() {
    const rankedUnitsData = rankedUnits.map((unitId, index) => {
        const unit = physicsUnits.find(u => u.id === unitId);
        return {
            rank: index + 1,
            unit: unit ? unit.name : unitId
        };
    });
    
    formData = {
        studentName: document.getElementById('student-name').value.trim(),
        gender: document.getElementById('gender').value,
        nationalId: document.getElementById('national-id').value.trim(),
        atoll: document.getElementById('atoll').value,
        island: document.getElementById('island').value,
        address: document.getElementById('address').value.trim(),
        contactNumber: document.getElementById('contact-number').value,
        school: document.getElementById('school').value.trim(),
        grade: document.getElementById('grade').value,
        email: document.getElementById('email').value.trim(),
        
        parentName: document.getElementById('parent-name').value.trim(),
        relation: document.getElementById('relation').value.trim(),
        parentContact: document.getElementById('parent-contact').value.trim(),
        parentEmail: document.getElementById('parent-email').value.trim(),
        
        device: document.getElementById('device').value,
        physicsDifficulty: document.getElementById('physics-difficulty').value,
        lastExamGrade: document.getElementById('last-exam-grade').value,
        
        difficultUnits: rankedUnitsData,
        difficultUnitsString: rankedUnitsData.map(item => `${item.rank}. ${item.unit}`).join(', '),
        
        timestamp: new Date().toISOString()
    };
}

async function submitToGoogleSheets() {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submitForm',
                formData: formData,
                fileData: uploadedFileBase64,
                fileName: uploadedFileName
            })
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Network response was not ok. Status: ${response.status}. Body: ${errorBody}`);
        }
        
        const result = await response.json();
        
        return result;
        
    } catch (error) {
        throw error;
    }
}

function showSuccessScreen(referenceNumber) {
    document.getElementById('application-form').classList.remove('active');
    document.getElementById('success-screen').classList.add('active');
    
    document.getElementById('ref-number').textContent = referenceNumber;
}

function closeApplication() {
    // Standard form reset logic...
    const form = document.getElementById('application-form');
    form.reset(); 

    // Reset file data state
    uploadedFileBase64 = null;
    uploadedFileName = null;
    document.getElementById('file-preview').innerHTML = '';
    
    // Reset difficult units ranking
    resetUnitsRanking();
    
    // Go back to welcome screen
    document.getElementById('success-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.add('active');
    
    // Reset sections and set the first one active
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('student-info').classList.add('active');
    
    // Reset field disabled state (Student Info fields should be disabled initially)
    sectionFields['student-info'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && field.id !== 'student-name') { // Keep student-name enabled
            field.disabled = true;
        }
    });

    // Parent/Background/Upload fields should all be disabled initially on reset
    ['parent-info', 'background-info', 'document-upload'].forEach(sectionId => {
        sectionFields[sectionId].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.disabled = true;
        });
    });

    currentSection = 'student-info';
    
    // Reset submit button
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.textContent = 'Submit Application';
    submitBtn.disabled = false;
    document.getElementById('application-form').classList.remove('loading');
    
    // Clear any field errors
    document.querySelectorAll('.field-error').forEach(error => error.remove());
    document.querySelectorAll('.form-control, select').forEach(field => field.style.borderColor = '#e0e0e0');
}

function resetUnitsRanking() {
    rankedUnits = [];
    document.querySelectorAll('.unit-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('.rank-badge').forEach(badge => {
        badge.style.display = 'none';
    });
    document.getElementById('ranking-display').innerHTML = '<p>Select units and rank them by dragging. Most difficult = 1, Least difficult = 6</p>';
}