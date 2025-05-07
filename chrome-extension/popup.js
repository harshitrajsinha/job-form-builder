document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup: Script loaded");
  const previewButton = document.getElementById("previewForm");
  const container = document.getElementById("titlesContainer");

  // Close popup when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target === document.documentElement) {
      window.close();
    }
  });

  // Fetch data titles when popup opens
  fetchDataTitles();

  // Add click handler for preview button
  previewButton.addEventListener("click", async () => {
    try {
      // Fetch form data from extension storage
      chrome.storage.local.get("selected-title", (result) => {
        if (result["selected-title"]) {
          const formData = result["selected-title"];

          // Save form data and open side panel directly from popup (user gesture)
          chrome.storage.local.set({ formPreviewData: formData }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs.length > 0) {
                chrome.sidePanel.open({ windowId: tabs[0].windowId }).then(() => {
                  console.log("Side panel opened successfully");
                  window.close();
                }).catch((err) => {
                  console.error("Error opening side panel:", err);
                  showMessage("Error opening side panel. Please try again.", "error");
                });
              } else {
                showMessage("No active tab found.", "error");
              }
            });
          });
        } else {
          console.error("Popup: No form data found for selected title");
          showMessage(
            "No form data found. Please select a title first.",
            "error"
          );
        }
      });
    } catch (error) {
      console.error("Popup: Error:", error);
      showMessage("Error loading form data. Please try again.", "error");
    }
  });

  // Function to show messages
  function showMessage(message, type = "error") {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll(".message");
    existingMessages.forEach((msg) => msg.remove());

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
            margin: 10px 0;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            ${
              type === "error"
                ? "background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;"
                : "background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;"
            }
        `;

    // Insert after the h3 element
    const h3 = document.querySelector("h3");
    if (h3 && h3.parentNode) {
      h3.parentNode.insertBefore(messageDiv, h3.nextSibling);

      // Remove the message after 3 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 3000);
    }
  }

  function fetchDataTitles() {
    fetch("http://localhost:5000/get_data_titles")
      .then((response) => response.json())
      .then((data) => {
        console.log("Popup: Received data titles:", data);

        const container = document.getElementById("titlesContainer");
        container.innerHTML = "";

        // Show only first 5 titles initially
        const titlesToShow = data.slice(0, 5);
        const hasMore = data.length > 5;

        titlesToShow.forEach((title) => {
          const button = document.createElement("button");
          button.className = "title-button";
          button.textContent = title.title;
          button.title = title.title; // Add title attribute for tooltip
          button.addEventListener("click", async () => {
            try {
              const response = await fetch(
                `http://localhost:5000/get_form_data?title=${encodeURIComponent(
                  title.title
                )}`
              );
              const data = await response.json();

              if (response.ok) {
                // Store the form data in Chrome's storage
                chrome.storage.local.set({ ["selected-title"]: data }, () => {
                  console.log(
                    "Popup: Form data stored for title:",
                    "selected-title"
                  );
                  showMessage("Form data loaded successfully!", "success");
                });
              } else {
                console.error("Popup: Error fetching form data:", data.error);
                throw new Error(data.error);
              }
            } catch (error) {
              console.error("Popup: Error:", error);
              showMessage("Error loading form data", "error");
            }
          });
          container.appendChild(button);
        });

        // Add "Show More" button if there are more than 5 titles
        if (hasMore) {
          const showMoreButton = document.createElement("button");
          showMoreButton.className = "title-button";
          showMoreButton.textContent = "Show More...";
          showMoreButton.style.backgroundColor = "#2196F3";
          showMoreButton.addEventListener("click", () => {
            // Clear the container and show all titles
            container.innerHTML = "";
            data.forEach((title) => {
              const button = document.createElement("button");
              button.className = "title-button";
              button.textContent = title.title;
              button.title = title.title;
              button.addEventListener("click", async () => {
                try {
                  const response = await fetch(
                    `http://localhost:5000/get_form_data?title=${encodeURIComponent(
                      title.title
                    )}`
                  );
                  const data = await response.json();

                  if (response.ok) {
                    // Store the form data in Chrome's storage
                    chrome.storage.local.set(
                      { ["selected-title"]: data },
                      () => {
                        console.log(
                          "Popup: Form data stored for title:",
                          "selected-title"
                        );
                        showMessage(
                          "Form data loaded successfully!",
                          "success"
                        );
                      }
                    );
                  }
                } catch (error) {
                  console.error("Error loading form data:", error);
                  showMessage("Error loading form data", "error");
                }
              });
              container.appendChild(button);
            });
          });
          container.appendChild(showMoreButton);
        }
      })
      .catch((error) =>
        console.error("Popup: Error fetching data titles:", error)
      );
  }

  // Update button text based on sidebar state
  function updateButtonText(isOpen) {
    console.log(
      "Popup: Updating button text to:",
      isOpen ? "Close Sidebar" : "Open Sidebar"
    );
    const button = document.querySelector("button");
    if (button) {
      button.textContent = isOpen ? "Close Sidebar" : "Open Sidebar";
    }
  }

  // Listen for title selection
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "titleSelected") {
      console.log("Popup: Title selected:", request.title);
    }
  });

  // Listen for sidebar state changes
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.log("Popup: Received message:", request);
    if (request.action === "sidebarToggled") {
      updateButtonText(request.isOpen);
    }
  });
});
