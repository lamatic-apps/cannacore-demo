// State management
let selectedImages = [];
let selectedPdf = null;

// Get DOM elements
const imageInput = document.getElementById('imageInput');
const pdfInput = document.getElementById('pdfInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const pdfUploadArea = document.getElementById('pdfUploadArea');
const imagePreview = document.getElementById('imagePreview');
const pdfPreview = document.getElementById('pdfPreview');
const uploadForm = document.getElementById('uploadForm');
const submitBtn = document.getElementById('submitBtn');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');

// IMAGE file input
imageUploadArea.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => handleImageFiles(e.target.files));

imageUploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    imageUploadArea.classList.add('drag-over');
});

imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.classList.remove('drag-over');
});

imageUploadArea.addEventListener('drop', e => {
    e.preventDefault();
    imageUploadArea.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    handleImageFiles(files);
});

// PDF file input
pdfUploadArea.addEventListener('click', () => pdfInput.click());
pdfInput.addEventListener('change', e => {
    if (e.target.files.length > 0) handlePdfFile(e.target.files[0]);
});

pdfUploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    pdfUploadArea.classList.add('drag-over');
});

pdfUploadArea.addEventListener('dragleave', () => pdfUploadArea.classList.remove('drag-over'));

pdfUploadArea.addEventListener('drop', e => {
    e.preventDefault();
    pdfUploadArea.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (files.length > 0) handlePdfFile(files[0]);
});

// HANDLE IMAGES
function handleImageFiles(files) {
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            selectedImages.push(file);
        }
    }
    updateImagePreview();
    updateSubmitButton();
}

// IMAGE PREVIEW
function updateImagePreview() {
    if (selectedImages.length === 0) {
        imagePreview.innerHTML = "";
        return;
    }

    const grid = document.createElement("div");
    grid.className = "image-preview-grid";

    selectedImages.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "image-preview-item";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name;

        const btn = document.createElement("button");
        btn.className = "remove-image";
        btn.textContent = "×";
        btn.onclick = e => {
            e.preventDefault();
            removeImage(index);
        };

        item.appendChild(img);
        item.appendChild(btn);
        grid.appendChild(item);
    });

    imagePreview.innerHTML = "";
    imagePreview.appendChild(grid);
}

function removeImage(index) {
    selectedImages.splice(index, 1);
    updateImagePreview();
    updateSubmitButton();
}

// HANDLE PDF
function handlePdfFile(file) {
    selectedPdf = file;
    updatePdfPreview();
    updateSubmitButton();
}

function updatePdfPreview() {
    if (!selectedPdf) {
        pdfPreview.innerHTML = "";
        return;
    }

    pdfPreview.innerHTML = `
        <div class="pdf-preview">
            <strong>${selectedPdf.name}</strong>
            <span>${formatFileSize(selectedPdf.size)}</span>
            <button onclick="removePdf(event)">Remove</button>
        </div>`;
}

function removePdf(e) {
    e.preventDefault();
    selectedPdf = null;
    pdfInput.value = "";
    updatePdfPreview();
    updateSubmitButton();
}

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function updateSubmitButton() {
    submitBtn.disabled = !(selectedImages.length > 0 && selectedPdf);
}

// HANDLE SUBMIT
uploadForm.addEventListener('submit', async e => {
    e.preventDefault();
    resultsSection.innerHTML = "";
    errorSection.innerHTML = "";
    errorSection.style.display = "none";
    resultsSection.style.display = "none";

    const formData = new FormData();
    selectedImages.forEach(img => formData.append("images", img));
    formData.append("pdf", selectedPdf);

    uploadForm.style.display = "none";
    loadingState.style.display = "block";

    try {
        const response = await fetch("/api/check-compliance", {
            method: "POST",
            body: formData
        });
        
        console.log("Raw Response:", response);
        const json = await response.json();
        console.log("Full JSON Response:", JSON.stringify(json, null, 2));

        // FIXED: Parse the correct path from Lamatic response
        let issues = [];
        
        // Try multiple possible paths
        if (json?.data?.executeWorkflow?.result?.output?.issues) {
            issues = json.data.executeWorkflow.result.output.issues;
        } else if (json?.result?.output?.issues) {
            issues = json.result.output.issues;
        } else if (json?.result?.issues) {
            issues = json.result.issues;
        } else if (json?.issues) {
            issues = json.issues;
        } else if (json?.output?.issues) {
            issues = json.output.issues;
        }

        console.log("Extracted issues:", issues);

        loadingState.style.display = "none";
        uploadForm.style.display = "block";
        
        if (Array.isArray(issues) && issues.length >= 0) {
            displayIssues(issues);
        } else {
            showError("Could not parse compliance issues from response. Check console for details.");
            console.error("Could not find issues array in response:", json);
        }

    } catch (err) {
        console.error("Error:", err);
        loadingState.style.display = "none";
        uploadForm.style.display = "block";
        showError(err.message || "An error occurred while checking compliance");
    }
});

// DISPLAY ISSUES ON SAME PAGE
function displayIssues(issues) {
    resultsSection.style.display = "block";
    resultsSection.innerHTML = `<h2>COMPLIANCE REPORT</h2>`;

    if (issues.length === 0) {
        resultsSection.innerHTML += "<div class='results-card' style='background:#d4edda;border-left:4px solid #28a745;'><p style='color:#155724;font-weight:bold;'>✓ No non-compliant issues found! Product appears to be compliant.</p></div>";
        return;
    }

    resultsSection.innerHTML += `<p style="color:#721c24;font-weight:bold;margin-bottom:20px;">Found ${issues.length} compliance issue(s):</p>`;

    issues.forEach((issue, index) => {
        const card = document.createElement("div");
        card.className = "results-card";

        card.innerHTML = `
            <h3 style="color:#721c24;margin-top:0;">Issue #${index + 1}</h3>
            <p style="color:#721c24;font-weight:bold;margin-bottom:10px;">${issue.issue_identified || "No issue description"}</p>
            <p><strong>Evidence:</strong> ${issue.evidence || "None provided"}</p>
            <p><strong>Suggested Fix:</strong> ${issue.suggested_fix || "None provided"}</p>
        `;
        resultsSection.appendChild(card);
    });
}

function showError(msg) {
    errorSection.style.display = "block";
    errorSection.innerHTML = `<p style="color:#721c24;padding:15px;background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;">${msg}</p>`;
}