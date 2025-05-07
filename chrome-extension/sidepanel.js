console.log("Side Panel: Script loaded");

// Function to create a field preview element
function createFieldPreview(field) {
  const fieldPreview = document.createElement("div");
  fieldPreview.className = "field-preview";

  const fieldHeader = document.createElement("div");
  fieldHeader.className = "field-header";

  const fieldTitle = document.createElement("h4");
  fieldTitle.className = "field-title";
  fieldTitle.textContent = field.title || "Untitled Field";

  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.textContent = "Copy";
  copyButton.onclick = () => {
    navigator.clipboard.writeText(field.value || "").then(() => {
      showNotification("Copied to clipboard!");
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 2000);
    });
  };

  fieldHeader.appendChild(fieldTitle);
  fieldHeader.appendChild(copyButton);

  const fieldValue = document.createElement("div");
  fieldValue.className = "field-value";
  fieldValue.textContent = field.value || "";

  fieldPreview.appendChild(fieldHeader);
  fieldPreview.appendChild(fieldValue);

  return fieldPreview;
}

function showNotification(message) {
  // Check if there's an existing notification
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create new notification
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;

  // Add to container at the top
  const container = document.querySelector(".preview-container");
  container.insertBefore(notification, container.firstChild);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 2500);
}

// Function to load form data from storage and display it
function loadFormData() {
  console.log("Side Panel: Loading form data from storage");
  chrome.storage.local.get("formPreviewData", (result) => {
    const formData = result.formPreviewData;
    console.log("Side Panel: Form data loaded:", formData);

    if (formData && Array.isArray(formData)) {
      const formPreviewContent = document.getElementById("formPreviewContent");
      formPreviewContent.innerHTML = "";

      // Display each field from the form data
      formData.forEach((field) => {
        const fieldElement = createFieldPreview(field);
        formPreviewContent.appendChild(fieldElement);
      });
    } else {
      console.error("Side Panel: No valid form data found");
      document.getElementById("formPreviewContent").innerHTML =
        "<p>No form data available. Please select a title first.</p>";
    }
  });
}

// Load form data when the side panel is opened
document.addEventListener("DOMContentLoaded", loadFormData);

// Listen for storage changes to update the panel if needed
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.formPreviewData) {
    console.log("Side Panel: Form data updated in storage");
    loadFormData();
  }
});
