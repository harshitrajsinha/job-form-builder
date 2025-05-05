console.log('Content: Script loaded');
let isInjected = true;

// Ensure the message listener is set up
const messageListener = function(request, sender, sendResponse) {
    console.log('Content: Received message:', request);
    if (request.action === 'selectTitle') {
        console.log('Content: Title selected:', request.titleId);
        // Send message to popup that title was selected
        chrome.runtime.sendMessage({action: 'titleSelected', titleId: request.titleId});
    } else if (request.action === 'displayFormPreview') {
        console.log('Content: Displaying form preview');
        displayFormPreview(request.formData);
    } else if (request.action === 'checkInjection') {
        console.log('Content: Checking injection status');
        sendResponse({ isInjected: true });
    }
    return true; // Keep the message channel open for sendResponse
};

// Add the message listener
chrome.runtime.onMessage.addListener(messageListener);

function displayFormPreview(formData) {
    // Remove existing preview panel if it exists
    const existingPanel = document.getElementById('formPreviewPanel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create the preview panel
    const panel = document.createElement('div');
    panel.id = 'formPreviewPanel';
    panel.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        z-index: 9999;
        display: flex;
        flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px;
        border-bottom: 1px solid #ddd;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; font-size: 16px;">Form Preview</h3>
        <button id="closePreview" style="background: none; border: none; cursor: pointer; font-size: 20px; padding: 5px;">×</button>
    `;

    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    `;

    // Create form preview content
    formData.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-preview';
        
        const fieldHeader = document.createElement('div');
        fieldHeader.className = 'field-header';
        
        const fieldTitle = document.createElement('div');
        fieldTitle.className = 'field-title';
        fieldTitle.textContent = field.title;
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.onclick = function() {
            copyFieldValue(field.value);
        };
        
        fieldHeader.appendChild(fieldTitle);
        fieldHeader.appendChild(copyButton);
        
        const fieldValue = document.createElement('div');
        fieldValue.className = 'field-value';
        fieldValue.textContent = field.value || '';
        
        fieldDiv.appendChild(fieldHeader);
        fieldDiv.appendChild(fieldValue);
        content.appendChild(fieldDiv);
    });

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .field-preview {
            margin-bottom: 0.5rem;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }

        .field-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .field-title {
            font-weight: bold;
            color: #333;
            margin: 0;
        }

        .field-value {
            padding: 12px;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            min-height: 60px;
            max-height: 200px;
            word-wrap: break-word;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            line-height: 1.5;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #888 #f1f1f1;
        }

        .copy-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }

        .copy-button:hover {
            background-color: #45a049;
        }

        .copy-button:active {
            background-color: #388e3c;
        }
    `;

    // Add elements to the panel
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(styles);

    // Add event listener for close button
    const closeButton = panel.querySelector('#closePreview');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            panel.remove();
        });
    }

    // Add the panel to the body
    document.body.appendChild(panel);
}

function copyFieldValue(value) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    
    // Show success message
    const message = document.createElement('div');
    message.textContent = 'Copied to clipboard!';
    message.style.cssText = `
        margin: 10px 0;
        padding: 10px;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        color: #155724;
    `;
    const panel = document.getElementById('formPreviewPanel');
    if (panel) {
        panel.insertBefore(message, panel.firstChild);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

function toggleSidebar() {
    console.log('Content: Toggling sidebar - current state:', isSidebarOpen);
    if (isSidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
    
    // Update the popup button text
    console.log('Content: Sending sidebar state update:', isSidebarOpen);
    chrome.runtime.sendMessage({action: 'sidebarToggled', isOpen: isSidebarOpen});
}

function openSidebar() {
    // Create the sidebar element
    sidebar = document.createElement('div');
    sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        z-index: 9999;
        display: flex;
        flex-direction: column;
    `;

    // Create the header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px;
        border-bottom: 1px solid #ddd;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; font-size: 16px;">Form Preview</h3>
        <button id="closeSidebar" style="
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            padding: 5px;
        ">×</button>
    `;

    // Create the content area
    const content = document.createElement('div');
    content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    `;

    // Load the form data from localStorage
    const formData = JSON.parse(localStorage.getItem('formData')) || [];
    
    // Create the form preview content
    formData.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-preview';
        
        const fieldHeader = document.createElement('div');
        fieldHeader.className = 'field-header';
        
        const fieldTitle = document.createElement('div');
        fieldTitle.className = 'field-title';
        fieldTitle.textContent = field.title;
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.onclick = function() {
            copyFieldValue(field.value);
        };
        
        fieldHeader.appendChild(fieldTitle);
        fieldHeader.appendChild(copyButton);
        
        const fieldValue = document.createElement('div');
        fieldValue.className = 'field-value';
        fieldValue.textContent = field.value || '';
        
        fieldDiv.appendChild(fieldHeader);
        fieldDiv.appendChild(fieldValue);
        content.appendChild(fieldDiv);
    });

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .field-preview {
            margin-bottom: 0.5rem;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }

        .field-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .field-title {
            font-weight: bold;
            color: #333;
            margin: 0;
        }

        .field-value {
            padding: 12px;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            min-height: 60px;
            max-height: 200px;
            word-wrap: break-word;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            line-height: 1.5;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #888 #f1f1f1;
        }

        .copy-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }

        .copy-button:hover {
            background-color: #45a049;
        }

        .copy-button:active {
            background-color: #388e3c;
        }
    `;

    // Append elements to the sidebar
    sidebar.appendChild(header);
    sidebar.appendChild(content);
    sidebar.appendChild(styles);

    // Add event listener for close button
    const closeButton = sidebar.querySelector('#closeSidebar');
    if (closeButton) {
        closeButton.addEventListener('click', closeSidebar);
    }
    
    // Add the sidebar to the body
    document.body.appendChild(sidebar);
    isSidebarOpen = true;
}

// Close sidebar function
function closeSidebar() {
    const sidebar = document.getElementById('formPreviewPanel');
    if (sidebar) {
        sidebar.remove();
    }
}

function copyFieldValue(value) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(textarea);
    
    // Show a temporary success message
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}
