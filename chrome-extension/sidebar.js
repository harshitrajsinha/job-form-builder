// Function to create a field preview element
function createFieldPreview(label, value) {
    const fieldPreview = document.createElement('div');
    fieldPreview.className = 'field-preview';
    
    const fieldHeader = document.createElement('div');
    fieldHeader.className = 'field-header';
    
    const fieldTitle = document.createElement('h5');
    fieldTitle.className = 'field-title';
    fieldTitle.textContent = label;
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.onclick = () => {
        navigator.clipboard.writeText(value).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 2000);
        });
    };
    
    fieldHeader.appendChild(fieldTitle);
    fieldHeader.appendChild(copyButton);
    
    const fieldValue = document.createElement('div');
    fieldValue.className = 'field-value';
    fieldValue.textContent = value;
    
    fieldPreview.appendChild(fieldHeader);
    fieldPreview.appendChild(fieldValue);
    
    return fieldPreview;
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showFormPreview') {
        const formPreviewContent = document.getElementById('formPreviewContent');
        formPreviewContent.innerHTML = '';
        
        // Create a title field
        const titleField = createFieldPreview('Title', request.title);
        formPreviewContent.appendChild(titleField);
        
        // Add a horizontal line
        const hr = document.createElement('hr');
        formPreviewContent.appendChild(hr);
        
        // Display each field from the form data
        Object.entries(request.data).forEach(([key, value]) => {
            const field = createFieldPreview(key, value);
            formPreviewContent.appendChild(field);
        });
    }
});
