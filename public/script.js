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
    
    // Clear previous results
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const json = await response.json();
        console.log("=== FULL API RESPONSE ===");
        console.log(JSON.stringify(json, null, 2));
        console.log("=========================");

        loadingState.style.display = "none";
        uploadForm.style.display = "block";

        // Extract issues - try all possible paths
        let issues = null;
        
        if (json?.data?.executeWorkflow?.result?.output?.issues) {
            issues = json.data.executeWorkflow.result.output.issues;
            console.log("✓ Found issues at: data.executeWorkflow.result.output.issues");
        } else if (json?.result?.output?.issues) {
            issues = json.result.output.issues;
            console.log("✓ Found issues at: result.output.issues");
        } else if (json?.output?.issues) {
            issues = json.output.issues;
            console.log("✓ Found issues at: output.issues");
        } else if (json?.issues) {
            issues = json.issues;
            console.log("✓ Found issues at: issues");
        }

        console.log("Extracted issues:", issues);
        console.log("Is array?", Array.isArray(issues));
        console.log("Length:", issues ? issues.length : 'null');

        if (Array.isArray(issues)) {
            displayIssues(issues);
        } else {
            // Show raw JSON if we can't parse it
            resultsSection.style.display = "block";
            resultsSection.innerHTML = `
                <h2>RAW API RESPONSE (Debug Mode)</h2>
                <pre style="background:#f5f5f5;padding:15px;overflow:auto;max-height:400px;border:1px solid #ddd;">${JSON.stringify(json, null, 2)}</pre>
            `;
            showError("Could not parse issues array. Check console and raw response above.");
        }

    } catch (err) {
        console.error("❌ ERROR:", err);
        loadingState.style.display = "none";
        uploadForm.style.display = "block";
        showError(`Error: ${err.message}`);
    }
});

// DISPLAY ISSUES ON SAME PAGE
function displayIssues(issues) {
    console.log("displayIssues called with:", issues);
    
    resultsSection.style.display = "block";
    resultsSection.innerHTML = `<h2 style="color:#333;margin-bottom:20px;">COMPLIANCE REPORT</h2>`;

    if (!issues || issues.length === 0) {
        resultsSection.innerHTML += `
            <div style="background:#d4edda;border-left:4px solid #28a745;padding:20px;border-radius:4px;">
                <p style="color:#155724;font-weight:bold;margin:0;">✓ No non-compliant issues found!</p>
            </div>`;
        return;
    }

    resultsSection.innerHTML += `
        <div style="background:#f8d7da;border-left:4px solid #dc3545;padding:15px;margin-bottom:20px;border-radius:4px;">
            <p style="color:#721c24;font-weight:bold;margin:0;">Found ${issues.length} compliance issue(s)</p>
        </div>`;

    issues.forEach((issue, index) => {
        const card = document.createElement("div");
        card.style.cssText = "background:white;border:1px solid #ddd;border-radius:8px;padding:20px;margin-bottom:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);";

        const title = document.createElement("h3");
        title.style.cssText = "color:#dc3545;margin:0 0 15px 0;font-size:18px;";
        title.textContent = `Issue #${index + 1}`;

        const issueText = document.createElement("div");
        issueText.style.cssText = "background:#fff3cd;border-left:3px solid #ffc107;padding:10px;margin-bottom:12px;";
        issueText.innerHTML = `<strong>Issue:</strong> ${issue.issue_identified || "No description"}`;

        const evidence = document.createElement("div");
        evidence.style.cssText = "background:#f8f9fa;padding:10px;margin-bottom:12px;border-radius:4px;";
        evidence.innerHTML = `<strong>Evidence:</strong> ${issue.evidence || "None provided"}`;

        const fix = document.createElement("div");
        fix.style.cssText = "background:#e7f3ff;border-left:3px solid #007bff;padding:10px;";
        fix.innerHTML = `<strong>Suggested Fix:</strong> ${issue.suggested_fix || "None provided"}`;

        card.appendChild(title);
        card.appendChild(issueText);
        card.appendChild(evidence);
        card.appendChild(fix);
        
        resultsSection.appendChild(card);
    });
}

function showError(msg) {
    errorSection.style.display = "block";
    errorSection.innerHTML = `
        <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:15px;color:#721c24;">
            <strong>Error:</strong> ${msg}
        </div>`;
}