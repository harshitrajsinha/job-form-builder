document.addEventListener("DOMContentLoaded", () => {
  const formPreview = document.getElementById("formPreview");
  const fieldItems = document.querySelectorAll(".field-item");
  const submitButton = document.getElementById("submitForm");
  let formData = JSON.parse(localStorage.getItem("formData")) || [];

  // Function to save form data to localStorage
  function saveFormData() {
    const fields = Array.from(formPreview.querySelectorAll(".form-field"));
    formData = fields.map((field) => ({
      title: field.querySelector(".field-title").textContent,
      value: field.querySelector("input, textarea").value,
    }));
    localStorage.setItem("formData", JSON.stringify(formData));
  }

  // Make field items clickable
  fieldItems.forEach((item) => {
    item.addEventListener("click", () => {
      addFormField(item.dataset.type);
    });
  });

  // Add event listener for submit button
  submitButton.addEventListener("click", () => {
    saveFormData();
    window.open("preview.html", "_blank");
  });

  // Function to update submit button state
  function updateSubmitButtonState() {
    const hasFields = formPreview.querySelector(".form-field");
    submitButton.disabled = !hasFields;
  }

  // Function to add a form field
  function addFormField(type) {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "form-field";
    fieldDiv.draggable = true;
    fieldDiv.dataset.type = type;

    const fieldTitle = prompt("Enter field title:");
    if (!fieldTitle) return;

    fieldDiv.innerHTML = `
            <span class="field-title">${fieldTitle}</span>
            <span class="remove-field" onclick="removeField(this)">×</span>
            ${createFormField(type)}
        `;

    // Add drag event listeners
    fieldDiv.addEventListener("dragstart", handleDragStart);
    fieldDiv.addEventListener("dragover", handleDragOver);
    fieldDiv.addEventListener("dragleave", handleDragLeave);
    fieldDiv.addEventListener("drop", handleDrop);
    fieldDiv.addEventListener("dragend", handleDragEnd);

    formPreview.appendChild(fieldDiv);
    updateSubmitButtonState();
  }

  // Drag and Drop functionality
  let draggedItem = null;
  let dragOverItem = null;

  function handleDragStart(e) {
    this.classList.add("dragging");
    draggedItem = this;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", this.innerHTML);

    // Add a clone for drag image
    const dragImage = this.cloneNode(true);
    dragImage.style.width = `${this.offsetWidth}px`;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Remove the clone after a short delay
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Remove previous drag-over classes
    document.querySelectorAll(".form-field.drag-over").forEach((el) => {
      el.classList.remove("drag-over", "before", "after");
    });

    // Calculate drop position
    const rect = this.getBoundingClientRect();
    const dropY = e.clientY - rect.top;
    const dropPosition = dropY > rect.height / 2 ? "after" : "before";

    // Add appropriate class based on drop position
    this.classList.add("drag-over", dropPosition);
    dragOverItem = this;

    return false;
  }

  function handleDragLeave() {
    this.classList.remove("drag-over", "before", "after");
  }

  function handleDrop(e) {
    e.preventDefault();

    // Remove all drag-over classes
    document.querySelectorAll(".form-field.drag-over").forEach((el) => {
      el.classList.remove("drag-over", "before", "after");
    });

    if (draggedItem !== this && dragOverItem) {
      const rect = this.getBoundingClientRect();
      const dropY = e.clientY - rect.top;
      const dropPosition = dropY > rect.height / 2 ? "after" : "before";

      if (dropPosition === "after") {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
      } else {
        this.parentNode.insertBefore(draggedItem, this);
      }

      // Save the new order
      saveFormData();
    }

    return false;
  }

  function handleDragEnd() {
    this.classList.remove("dragging");
    draggedItem = null;
    dragOverItem = null;

    // Remove any remaining drag-over classes
    document.querySelectorAll(".form-field.drag-over").forEach((el) => {
      el.classList.remove("drag-over", "before", "after");
    });
  }

  // Function to create form fields based on type
  function createFormField(type) {
    switch (type) {
      case "text":
        return '<input type="text" placeholder="Enter text">';
      case "textarea":
        return '<textarea rows="4" placeholder="Enter text"></textarea>';
      case "number":
        return '<input type="number" placeholder="Enter number">';
      case "email":
        return '<input type="email" placeholder="Enter email">';
      default:
        return "";
    }
  }

  // Function to remove a field
  window.removeField = function (button) {
    const field = button.closest(".form-field");
    if (field) {
      field.remove();
      updateSubmitButtonState();
    }
  };
});
