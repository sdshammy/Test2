import { db, auth, storage } from './firebase.js';

// DOM elements
const ideaForm = document.getElementById('idea-submission-form');
const saveDraftBtn = document.getElementById('save-draft');
const submitBtn = document.getElementById('submit-idea');
const fileInput = document.getElementById('idea-attachments');
const filePreview = document.getElementById('file-preview');
const confirmationModal = document.getElementById('confirmation-modal');

// Variables
let uploadedFiles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("Submission script loaded");
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            console.log("No user, redirecting to login");
            window.location.href = 'index.html';
        } else {
            console.log("User authenticated:", user.email);
        }
    });
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    if (ideaForm) {
        ideaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitIdea(e).catch(error => {
                console.error("Submission error:", error);
                alert("Failed to submit idea. See console for details.");
            });
        });
    }
    
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }
});

async function handleFileUpload(e) {
    try {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        filePreview.innerHTML = '';
        uploadedFiles = [];
        
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'application/msword', 
                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                               'application/vnd.ms-powerpoint',
                               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                               'image/jpeg', 'image/png'];
            const maxSize = 5 * 1024 * 1024;
            
            if (!validTypes.includes(file.type)) {
                alert(`Invalid file type: ${file.name}`);
                return false;
            }
            
            if (file.size > maxSize) {
                alert(`File too large: ${file.name}`);
                return false;
            }
            
            return true;
        });
        
        uploadedFiles = validFiles;
        renderFilePreview();
        
    } catch (error) {
        console.error("File upload error:", error);
        alert("Error handling files");
    }
}

function renderFilePreview() {
    filePreview.innerHTML = '';
    uploadedFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <i class="fas fa-times" data-name="${file.name}"></i>
        `;
        filePreview.appendChild(fileItem);
    });
    
    filePreview.querySelectorAll('.fa-times').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const fileName = e.target.getAttribute('data-name');
            uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
            renderFilePreview();
        });
    });
}

async function saveDraft() {
    try {
        const formData = getFormData();
        localStorage.setItem('ideaDraft', JSON.stringify(formData));
        alert('Draft saved successfully!');
    } catch (error) {
        console.error("Error saving draft:", error);
        alert('Error saving draft');
    }
}

async function submitIdea(e) {
    if (!auth.currentUser) {
        alert('Please login to submit an idea');
        window.location.href = 'index.html';
        return;
    }
    
    const formData = getFormData();
    if (!validateForm(formData)) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const fileUrls = await uploadFiles();
        const idea = createIdeaObject(formData, fileUrls);
        
        const docRef = await db.collection('ideas').add(idea);
        console.log("Idea submitted with ID:", docRef.id);
        
        showConfirmation();
        resetForm();
        
    } catch (error) {
        console.error("Submission error:", error);
        alert(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Idea';
    }
}

function validateForm(formData) {
    const requiredFields = [
        'title', 'description', 'category', 
        'lob', 'department', 'impact', 'benefits'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
        alert(`Please fill all required fields. Missing: ${missingFields.join(', ')}`);
        return false;
    }
    
    return true;
}

function createIdeaObject(formData, fileUrls) {
    const user = auth.currentUser;
    return {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        lineOfBusiness: formData.lob,
        department: formData.department,
        impactLevel: formData.impact,
        expectedBenefits: formData.benefits,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        attachments: fileUrls,
        submittedBy: {
            uid: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            department: formData.department
        },
        status: 'Submitted',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        voteCount: 0,
        commentCount: 0,
        userVoted: false
    };
}

async function uploadFiles() {
    if (!uploadedFiles.length) return [];
    
    return Promise.all(
        uploadedFiles.map(file => {
            const storageRef = storage.ref(`idea-attachments/${Date.now()}_${file.name}`);
            return storageRef.put(file)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .catch(error => {
                    console.error(`Error uploading ${file.name}:`, error);
                    throw error;
                });
        })
    );
}

function showConfirmation() {
    confirmationModal.style.display = 'block';
    setTimeout(() => {
        confirmationModal.style.display = 'none';
    }, 5000);
}

function resetForm() {
    ideaForm.reset();
    filePreview.innerHTML = '';
    uploadedFiles = [];
    fileInput.value = '';
}

function getFormData() {
    return {
        title: document.getElementById('idea-title').value,
        description: document.getElementById('idea-description').value,
        category: document.getElementById('idea-category').value,
        lob: document.getElementById('idea-lob').value,
        department: document.getElementById('idea-department').value,
        impact: document.getElementById('idea-impact').value,
        benefits: document.getElementById('idea-benefits').value,
        tags: document.getElementById('idea-tags').value
    };
}