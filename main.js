/**
 * Kora-ju - Photo Collage Application Logic
 */

const MAX_IMAGES = 20;
let uploadedImages = [];
let layoutType = 'grid';
let aspectRatio = '1:1';

// Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const editorSection = document.getElementById('editor-section');
const gallerySection = document.getElementById('gallery-section');
const photoGrid = document.getElementById('photo-grid');
const photoCountDisplay = document.getElementById('photo-count');
const canvas = document.getElementById('collage-canvas');
const ctx = canvas.getContext('2d');
const layoutSelector = document.getElementById('layout-type');
const aspectSelector = document.getElementById('aspect-ratio');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const formatSelector = document.getElementById('export-format');
const bgColorSelector = document.getElementById('bg-color');
const previewImg = document.getElementById('preview-img');

// --- Initialization & Event Listeners ---

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Drag and Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'), false);
});

dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files);
});

// Controls
layoutSelector.addEventListener('change', (e) => {
    layoutType = e.target.value;
    renderCollage();
});

aspectSelector.addEventListener('change', (e) => {
    aspectRatio = e.target.value;
    renderCollage();
});

formatSelector.addEventListener('change', () => renderCollage());
bgColorSelector.addEventListener('change', () => renderCollage());

downloadBtn.addEventListener('click', downloadCollage);
resetBtn.addEventListener('click', resetApp);

// --- File Handling ---

async function handleFiles(files) {
    const newFiles = [...files].filter(file => file.type.startsWith('image/'));

    if (uploadedImages.length + newFiles.length > MAX_IMAGES) {
        alert(`最大${MAX_IMAGES}枚までしかアップロードできません。`);
        return;
    }

    for (const file of newFiles) {
        const img = await loadImage(file);
        uploadedImages.push({
            id: Date.now() + Math.random(),
            file: file,
            element: img
        });
    }

    updateUI();
}

function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(id) {
    uploadedImages = uploadedImages.filter(img => img.id !== id);
    updateUI();
}

// --- UI Updates ---

function updateUI() {
    if (uploadedImages.length > 0) {
        dropArea.classList.add('hidden');
        editorSection.classList.remove('hidden');
        gallerySection.classList.remove('hidden');
    } else {
        dropArea.classList.remove('hidden');
        editorSection.classList.add('hidden');
        gallerySection.classList.add('hidden');
    }

    photoCountDisplay.textContent = uploadedImages.length;

    // Update Gallery
    photoGrid.innerHTML = '';
    uploadedImages.forEach(imgData => {
        const item = document.createElement('div');
        item.className = 'photo-item';

        const previewImg = document.createElement('img');
        previewImg.src = imgData.element.src;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => removeImage(imgData.id);

        item.appendChild(previewImg);
        item.appendChild(removeBtn);
        photoGrid.appendChild(item);
    });

    renderCollage();
}

function resetApp() {
    if (confirm('すべての写真を削除して最初からやり直しますか？')) {
        uploadedImages = [];
        updateUI();
    }
}

// --- Collage Rendering ---

function renderCollage() {
    if (uploadedImages.length === 0) return;

    // Set Canvas Size based on Aspect Ratio
    const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
    const baseSize = 1200;
    canvas.width = baseSize;
    canvas.height = (baseSize / wRatio) * hRatio;

    // Clear Canvas
    ctx.fillStyle = bgColorSelector.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (layoutType === 'grid') {
        renderGrid();
    } else if (layoutType === 'circle') {
        renderCircle();
    } else {
        renderMasonry();
    }

    updatePreviewImage();
}

function updatePreviewImage() {
    try {
        const mimeType = formatSelector.value;
        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        previewImg.src = dataUrl;
        previewImg.classList.remove('hidden');
        canvas.classList.add('hidden'); // Hide canvas and show image for long-press
    } catch (e) {
        console.error('Preview update failed:', e);
    }
}

function renderGrid() {
    const count = uploadedImages.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    const padding = 10;

    uploadedImages.forEach((imgData, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = col * cellW + padding;
        const y = row * cellH + padding;
        const w = cellW - padding * 2;
        const h = cellH - padding * 2;

        drawImageClipped(imgData.element, x, y, w, h);
    });
}

function renderCircle() {
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const radius = Math.min(canvas.width, canvas.height) * 0.35;
    const size = Math.min(canvas.width, canvas.height) * 0.25;

    uploadedImages.forEach((imgData, i) => {
        const angle = (i / uploadedImages.length) * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius - size / 2;
        const y = center.y + Math.sin(angle) * radius - size / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        drawImageClipped(imgData.element, x, y, size, size);
        ctx.restore();
    });
}

function renderMasonry() {
    // A simple pseudo-masonry with random rotations and slight overlaps
    const count = uploadedImages.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    uploadedImages.forEach((imgData, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Randomize within cell
        const offsetX = (Math.random() - 0.5) * (cellW * 0.2);
        const offsetY = (Math.random() - 0.5) * (cellH * 0.2);
        const rotation = (Math.random() - 0.5) * 0.15; // Small rotation

        const x = col * cellW + cellW / 2 + offsetX;
        const y = row * cellH + cellH / 2 + offsetY;
        const w = cellW * 0.95;
        const h = cellH * 0.95;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Add shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        drawImageClipped(imgData.element, -w / 2, -h / 2, w, h);

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 10;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.restore();
    });
}

function drawImageClipped(img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const cellRatio = w / h;

    let sx, sy, sw, sh;

    if (imgRatio > cellRatio) {
        sh = img.height;
        sw = img.height * cellRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = img.width / cellRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// --- Actions ---

function downloadCollage() {
    try {
        const mimeType = formatSelector.value;
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';

        // Use toBlob for better performance and reliability
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas to Blob conversion failed.');
                alert('画像の生成に失敗しました。再度お試しください。');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            // Explicitly set link properties
            link.href = url;
            link.download = `kora-ju-collage-${Date.now()}.${extension}`;

            // Some browsers require the link to be in the body
            link.style.display = 'none';
            document.body.appendChild(link);

            // Trigger download
            link.click();

            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        }, mimeType, 0.9);
    } catch (e) {
        console.error('Download failed:', e);
        alert('保存中にエラーが発生しました。ブラウザの設定や画像を確認してください。');
    }
}
