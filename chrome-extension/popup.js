document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup: Script loaded');
    const toggleButton = document.getElementById('toggleSidebar');
    const previewButton = document.getElementById('previewForm');
    let isSidebarOpen = false;

    // Fetch data titles when popup opens
    fetchDataTitles();

    // Add click handler for preview button
    previewButton.addEventListener('click', async () => {
        try {
            // Fetch form data from extension storage
            chrome.storage.local.get('selected-title', (result) => {
                if (result['selected-title']) {
                    const formData = result['selected-title'];
                    
                    // Get the active tab
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (tabs.length > 0) {
                            const tab = tabs[0];
                            
                            // Inject content script if not already injected
                            chrome.tabs.sendMessage(tab.id, {action: 'checkInjection'}, function(response) {
                                if (chrome.runtime.lastError || !response?.isInjected) {
                                    // Inject the content script
                                    chrome.runtime.sendMessage({
                                        action: 'injectContentScript',
                                        tabId: tab.id
                                    }, function(response) {
                                        if (response?.status === 'success') {
                                            // Send the form preview message
                                            chrome.tabs.sendMessage(tab.id, {
                                                action: 'displayFormPreview',
                                                formData: formData
                                            }, function(response) {
                                                if (chrome.runtime.lastError) {
                                                    console.error('Popup: Error sending message:', chrome.runtime.lastError);
                                                    const message = document.createElement('div');
                                                    message.textContent = 'Error displaying form preview. Please refresh the page and try again.';
                                                    message.style.cssText = `
                                                        margin: 10px 0;
                                                        padding: 10px;
                                                        background-color: #f8d7da;
                                                        border: 1px solid #f5c6cb;
                                                        border-radius: 4px;
                                                        color: #721c24;
                                                    `;
                                                    document.body.insertBefore(message, toggleButton);
                                                    
                                                    // Remove the message after 3 seconds
                                                    setTimeout(() => {
                                                        message.remove();
                                                    }, 3000);
                                                }
                                            });
                                        } else {
                                            console.error('Popup: Error injecting content script:', response?.message);
                                            const message = document.createElement('div');
                                            message.textContent = 'Error injecting content script. Please refresh the page and try again.';
                                            message.style.cssText = `
                                                margin: 10px 0;
                                                padding: 10px;
                                                background-color: #f8d7da;
                                                border: 1px solid #f5c6cb;
                                                border-radius: 4px;
                                                color: #721c24;
                                            `;
                                            document.body.insertBefore(message, toggleButton);
                                            
                                            // Remove the message after 3 seconds
                                            setTimeout(() => {
                                                message.remove();
                                            }, 3000);
                                        }
                                    });
                                } else {
                                    // Content script is already injected, send the message
                                    chrome.tabs.sendMessage(tab.id, {
                                        action: 'displayFormPreview',
                                        formData: formData
                                    }, function(response) {
                                        if (chrome.runtime.lastError) {
                                            console.error('Popup: Error sending message:', chrome.runtime.lastError);
                                            const message = document.createElement('div');
                                            message.textContent = 'Error displaying form preview. Please refresh the page and try again.';
                                            message.style.cssText = `
                                                margin: 10px 0;
                                                padding: 10px;
                                                background-color: #f8d7da;
                                                border: 1px solid #f5c6cb;
                                                border-radius: 4px;
                                                color: #721c24;
                                            `;
                                            document.body.insertBefore(message, toggleButton);
                                            
                                            // Remove the message after 3 seconds
                                            setTimeout(() => {
                                                message.remove();
                                            }, 3000);
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.error('Popup: No form data found for software engineer');
                    const message = document.createElement('div');
                    message.textContent = 'No form data found. Please select a title first.';
                    message.style.cssText = `
                        margin: 10px 0;
                        padding: 10px;
                        background-color: #f8d7da;
                        border: 1px solid #f5c6cb;
                        border-radius: 4px;
                        color: #721c24;
                    `;
                    document.body.insertBefore(message, toggleButton);
                    
                    // Remove the message after 3 seconds
                    setTimeout(() => {
                        message.remove();
                    }, 3000);
                }
            });
        } catch (error) {
            console.error('Popup: Error:', error);
            const message = document.createElement('div');
            message.textContent = 'Error loading form data. Please try again.';
            message.style.cssText = `
                margin: 10px 0;
                padding: 10px;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                color: #721c24;
            `;
            document.body.insertBefore(message, toggleButton);
            
            // Remove the message after 3 seconds
            setTimeout(() => {
                message.remove();
            }, 3000);
        }
    });

    function fetchDataTitles() {
        fetch('http://localhost:5000/get_data_titles')
            .then(response => response.json())
            .then(data => {
                console.log('Popup: Received data titles:', data);
                
                // Create container if it doesn't exist
                let container = document.getElementById('titlesContainer');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'titlesContainer';
                    container.style.cssText = `
                        margin-top: 10px;
                        max-height: 200px;
                        overflow-y: auto;
                    `;
                    document.body.insertBefore(container, toggleButton);
                }
                
                // Clear and populate container
                container.innerHTML = '';
                data.forEach(title => {
                    const button = document.createElement('button');
                    button.textContent = title.title;
                    button.style.cssText = `
                        width: 100%;
                        margin: 5px 0;
                        padding: 8px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    `;
                    button.addEventListener('click', async () => {
                        try {
                            const response = await fetch(`http://localhost:5000/get_form_data?title=${encodeURIComponent(title.title)}`);
                            const data = await response.json();
                            
                            if (response.ok) {
                                // Store the form data in Chrome's storage
                                chrome.storage.local.set({["selected-title"]: data}, () => {
                                    console.log('Popup: Form data stored for title:', "selected-title");
                                });
                                
                                // Show success message
                                const message = document.createElement('div');
                                message.textContent = 'Form data loaded successfully!';
                                message.style.cssText = `
                                    margin: 10px 0;
                                    padding: 10px;
                                    background-color: #d4edda;
                                    border: 1px solid #c3e6cb;
                                    border-radius: 4px;
                                    color: #155724;
                                `;
                                container.insertBefore(message, container.firstChild);
                                
                                // Remove the message after 3 seconds
                                setTimeout(() => {
                                    message.remove();
                                }, 3000);
                            } else {
                                console.error('Popup: Error fetching form data:', data.error);
                                throw new Error(data.error);
                            }
                        } catch (error) {
                            console.error('Popup: Error:', error);
                            const message = document.createElement('div');
                            message.textContent = 'Error loading form data. Please try again.';
                            message.style.cssText = `
                                margin: 10px 0;
                                padding: 10px;
                                background-color: #f8d7da;
                                border: 1px solid #f5c6cb;
                                border-radius: 4px;
                                color: #721c24;
                            `;
                            container.insertBefore(message, container.firstChild);
                            
                            // Remove the message after 3 seconds
                            setTimeout(() => {
                                message.remove();
                            }, 3000);
                        }
                    });
                    container.appendChild(button);
                });
            })
            .catch(error => console.error('Popup: Error fetching data titles:', error));
    }

    // Update button text based on sidebar state
    function updateButtonText(isOpen) {
        console.log('Popup: Updating button text to:', isOpen ? 'Close Sidebar' : 'Open Sidebar');
        toggleButton.textContent = isOpen ? 'Close Sidebar' : 'Open Sidebar';
        isSidebarOpen = isOpen;
    }

    // Handle initial click
    toggleButton.addEventListener('click', function() {
        console.log('Popup: Clicked toggle button');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                console.log('Popup: Found active tab:', tabs[0]);
                chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSidebar'}, function(response) {
                    console.log('Popup: Received response:', response);
                    if (response && response.status === 'success') {
                        updateButtonText(!isSidebarOpen);
                    } else {
                        console.error('Popup: Failed to get response from content script');
                    }
                });
            } else {
                console.error('Popup: No active tab found');
            }
        });
    });

    // Listen for title selection
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'titleSelected') {
            console.log('Popup: Title selected:', request.title);
            // You can add any additional logic here if needed
        }
    });

    // Listen for sidebar state changes
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log('Popup: Received message:', request);
        if (request.action === 'sidebarToggled') {
            updateButtonText(request.isOpen);
        }
    });
});
