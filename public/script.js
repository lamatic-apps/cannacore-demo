// ===============================
// State management
// ===============================
let selectedImages = [];
let selectedPdf = null;

// DOM elements
const imageInput = document.getElementById("imageInput");
const pdfInput = document.getElementById("pdfInput");
const imageUploadArea = document.getElementById("imageUploadArea");
const pdfUploadArea = document.getElementById("pdfUploadArea");
const imagePreview = document.getElementById("imagePreview");
const pdfPreview = document.getElementById("pdfPreview");
const uploadForm = document.getElementById("uploadForm");
const submitBtn = document.getElementById("submitBtn");
const loadingState = document.getElementById("loadingState");
const resultsSection = document.getElementById("resultsSection");
const errorSection = document.getElementById("errorSection");

// ===============================
// IMAGE HANDLERS
// ===============================

imageUploadArea.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (e) => handleImageFiles(e.target.files));

imageUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    imageUploadArea.classList.add("drag-over");
});
imageUploadArea.addEventListener("dragleave", () =>
    imageUploadArea.classList.remove("drag-over")
);
imageUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    imageUploadArea.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
    );
    handleImageFiles(files);
});

function handleImageFiles(files) {
    selectedImages.push(...files);
    updateImagePreview();
    updateSubmitButton();
}

function updateImagePreview() {
    if (selectedImages.length === 0) {
        imagePreview.innerHTML = "";
        return;
    }

    const container = document.createElement("div");
    container.className = "image-preview-grid";

    selectedImages.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "image-preview-item";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "×";
        removeBtn.onclick = () => {
            selectedImages.splice(index, 1);
            updateImagePreview();
            updateSubmitButton();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });

    imagePreview.innerHTML = "";
    imagePreview.appendChild(container);
}

// ===============================
// PDF logic
// ===============================

pdfUploadArea.addEventListener("click", () => pdfInput.click());
pdfInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        selectedPdf = e.target.files[0];
        updatePdfPreview();
        updateSubmitButton();
    }
});

function updatePdfPreview() {
    if (!selectedPdf) {
        pdfPreview.innerHTML = "";
        return;
    }

    pdfPreview.innerHTML = `
        <div class="pdf-preview">
            <div><strong>${selectedPdf.name}</strong></div>
            <button onclick="removePdf(event)">Remove</button>
        </div>
    `;
}

function removePdf(e) {
    e.preventDefault();
    selectedPdf = null;
    updatePdfPreview();
    updateSubmitButton();
}

// ===============================
// SUBMIT HANDLER
// ===============================
uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedImages.length === 0 || !selectedPdf) {
        alert("Upload required files");
        return;
    }

    const formData = new FormData();
    selectedImages.forEach((img) => formData.append("images", img));
    formData.append("pdf", selectedPdf);

    loadingState.style.display = "block";
    uploadForm.style.display = "none";

    try {
        const response = await fetch("/api/check-compliance", {
            method: "POST",
            body: formData,
        });

        const apiData = await response.json();

        if (!apiData.result) throw new Error("Invalid response");

        // Extract the issues and store
        const issues =
            apiData.result?.output?.issues ||
            apiData.result?.issues ||
            [];

        console.log("Saving to sessionStorage:", issues);

        sessionStorage.setItem(
            "complianceResults",
            JSON.stringify({ issues })
        );

        window.location.href = "/results.html";
    } catch (err) {
        console.error("UPLOAD ERR:", err);
        alert("Upload failed");
        loadingState.style.display = "none";
        uploadForm.style.display = "block";
    }
});

// enable submit button when ready
function updateSubmitButton() {
    submitBtn.disabled = !(selectedImages.length > 0 && selectedPdf);
}
