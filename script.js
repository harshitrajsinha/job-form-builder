document.addEventListener('DOMContentLoaded', () => {
    const formPreview = document.getElementById('formPreview');
    const fieldItems = document.querySelectorAll('.field-item');
    const submitButton = document.getElementById('submitForm');
    let formData = JSON.parse(localStorage.getItem('formData')) || [];

    // Function to save form data to localStorage
    function saveFormData() {
        const fields = Array.from(formPreview.querySelectorAll('.form-field'));
        formData = fields.map(field => ({
            title: field.querySelector('.field-title').textContent,
            value: field.querySelector('input, textarea').value
        }));
        localStorage.setItem('formData', JSON.stringify(formData));
    }

    // Make field items clickable
    fieldItems.forEach(item => {
        item.addEventListener('click', () => {
            addFormField(item.dataset.type);
        });
    });

    // Add event listener for submit button
    submitButton.addEventListener('click', () => {
        saveFormData();
        window.open('preview.html', '_blank');
    });

    // Function to update submit button state
    function updateSubmitButtonState() {
        const hasFields = formPreview.querySelector('.form-field');
        submitButton.disabled = !hasFields;
    }

    // Function to add a form field
    function addFormField(type) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field';

        const fieldTitle = prompt('Enter field title:');
        if (!fieldTitle) return;

        fieldDiv.innerHTML = `
            <span class="field-title">${fieldTitle}</span>
            <span class="remove-field" onclick="removeField(this)">×</span>
            ${createFormField(type)}
        `;

        formPreview.appendChild(fieldDiv);
        updateSubmitButtonState();
    }

    // Function to create form fields based on type
    function createFormField(type) {
        switch(type) {
            case 'text':
                return '<input type="text" placeholder="Enter text">';
            case 'textarea':
                return '<textarea rows="4" placeholder="Enter text"></textarea>';
            case 'number':
                return '<input type="number" placeholder="Enter number">';
            case 'email':
                return '<input type="email" placeholder="Enter email">';
            case 'password':
                return '<input type="password" placeholder="Enter password">';
            default:
                return '';
        }
    }

    // Function to remove a field
    window.removeField = function(button) {
        const field = button.closest('.form-field');
        if (field) {
            field.remove();
            updateSubmitButtonState();
        }
    }
});
