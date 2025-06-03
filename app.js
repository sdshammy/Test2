import { db, auth, storage } from './firebase.js';

// DOM elements
const ideasContainer = document.getElementById('ideas-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const sortSelect = document.getElementById('sort-ideas');
const totalIdeasCount = document.getElementById('total-ideas-count');
const implementedCount = document.getElementById('implemented-count');
const activeUsers = document.getElementById('active-users');
const efficiencyGain = document.getElementById('efficiency-gain');

// Variables
let lastVisible = null;
let currentSort = 'newest';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas();
    loadStats();
    
    // Event listeners
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreIdeas);
    if (sortSelect) sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadIdeas();
    });
});

// Load ideas
async function loadIdeas() {
    ideasContainer.innerHTML = '';
    lastVisible = null;
    
    // Show skeleton loading
    for (let i = 0; i < 6; i++) {
        ideasContainer.appendChild(createSkeletonCard());
    }
    
    let query = db.collection('ideas')
        .orderBy('createdAt', 'desc')
        .limit(6);
    
    if (currentSort === 'votes') {
        query = db.collection('ideas')
            .orderBy('voteCount', 'desc')
            .limit(6);
    } else if (currentSort === 'comments') {
        query = db.collection('ideas')
            .orderBy('commentCount', 'desc')
            .limit(6);
    }
    
    try {
        const snapshot = await query.get();
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        ideasContainer.innerHTML = '';
        
        if (snapshot.empty) {
            ideasContainer.innerHTML = '<p class="no-ideas">No ideas found. Be the first to submit one!</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            ideasContainer.appendChild(createIdeaCard(doc.data(), doc.id));
        });
    } catch (error) {
        console.error("Error loading ideas:", error);
        ideasContainer.innerHTML = '<p class="error">Error loading ideas. Please try again.</p>';
    }
}

// Load more ideas
async function loadMoreIdeas() {
    if (!lastVisible) return;
    
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
    
    let query = db.collection('ideas')
        .orderBy('createdAt', 'desc')
        .startAfter(lastVisible)
        .limit(6);
    
    if (currentSort === 'votes') {
        query = db.collection('ideas')
            .orderBy('voteCount', 'desc')
            .startAfter(lastVisible)
            .limit(6);
    } else if (currentSort === 'comments') {
        query = db.collection('ideas')
            .orderBy('commentCount', 'desc')
            .startAfter(lastVisible)
            .limit(6);
    }
    
    try {
        const snapshot = await query.get();
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        if (snapshot.empty) {
            loadMoreBtn.style.display = 'none';
            return;
        }
        
        snapshot.forEach(doc => {
            ideasContainer.appendChild(createIdeaCard(doc.data(), doc.id));
        });
    } catch (error) {
        console.error("Error loading more ideas:", error);
    } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Ideas';
    }
}

// Create idea card
function createIdeaCard(idea, id) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.dataset.id = id;
    
    // Calculate days ago
    const daysAgo = Math.floor((new Date() - idea.createdAt.toDate()) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
        <div class="idea-card-header">
            <h3>${idea.title}</h3>
            <p class="idea-card-category">${idea.category}</p>
        </div>
        <div class="idea-card-body">
            <p class="idea-card-description">${idea.description.substring(0, 150)}...</p>
            <div class="idea-card-meta">
                <span><i class="fas fa-building"></i> ${idea.department}</span>
                <span><i class="fas fa-clock"></i> ${daysAgo}d ago</span>
            </div>
        </div>
        <div class="idea-card-footer">
            <div class="idea-card-author">
                <img src="https://ui-avatars.com/api/?name=${idea.submittedBy.name}&background=random" alt="${idea.submittedBy.name}">
                <span>${idea.submittedBy.name}</span>
            </div>
            <div class="idea-card-actions">
                <button class="vote-btn" data-id="${id}">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${idea.voteCount || 0}</span>
                </button>
                <button class="comment-btn" data-id="${id}">
                    <i class="fas fa-comment"></i>
                    <span>${idea.commentCount || 0}</span>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.vote-btn') && !e.target.closest('.comment-btn')) {
            viewIdeaDetails(id);
        }
    });
    
    const voteBtn = card.querySelector('.vote-btn');
    voteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleVote(id);
    });
    
    const commentBtn = card.querySelector('.comment-btn');
    commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewIdeaDetails(id, true);
    });
    
    return card;
}

// View idea details
function viewIdeaDetails(id, focusComment = false) {
    const modal = document.getElementById('idea-modal');
    const modalContent = document.getElementById('idea-modal-content');
    
    modalContent.innerHTML = `
        <div class="idea-details-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading idea details...</p>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Fetch idea details
    db.collection('ideas').doc(id).get()
        .then(doc => {
            if (!doc.exists) {
                modalContent.innerHTML = '<p class="error">Idea not found</p>';
                return;
            }
            
            const idea = doc.data();
            renderIdeaDetails(idea, doc.id, focusComment);
        })
        .catch(error => {
            console.error("Error loading idea:", error);
            modalContent.innerHTML = '<p class="error">Error loading idea details</p>';
        });
}

// Render idea details
function renderIdeaDetails(idea, id, focusComment) {
    const modalContent = document.getElementById('idea-modal-content');
    const daysAgo = Math.floor((new Date() - idea.createdAt.toDate()) / (1000 * 60 * 60 * 24));
    
    modalContent.innerHTML = `
        <div class="idea-details">
            <div class="idea-details-header">
                <h2>${idea.title}</h2>
                <div class="idea-meta">
                    <span class="idea-category">${idea.category}</span>
                    <span class="idea-status">${idea.status}</span>
                </div>
            </div>
            
            <div class="idea-details-body">
                <div class="idea-section">
                    <h3>Description</h3>
                    <p>${idea.description}</p>
                </div>
                
                <div class="idea-section">
                    <h3>Expected Benefits</h3>
                    <p>${idea.expectedBenefits}</p>
                </div>
                
                <div class="idea-section idea-meta-grid">
                    <div>
                        <h4>Submitted By</h4>
                        <p>
                            <img src="https://ui-avatars.com/api/?name=${idea.submittedBy.name}&background=random" alt="${idea.submittedBy.name}">
                            ${idea.submittedBy.name} (${idea.submittedBy.department})
                        </p>
                    </div>
                    <div>
                        <h4>Submitted</h4>
                        <p>${daysAgo} days ago</p>
                    </div>
                    <div>
                        <h4>Line of Business</h4>
                        <p>${idea.lineOfBusiness}</p>
                    </div>
                    <div>
                        <h4>Impact Level</h4>
                        <p>${idea.impactLevel}</p>
                    </div>
                </div>
                
                <div class="idea-votes">
                    <button class="vote-btn ${idea.userVoted ? 'active' : ''}" data-id="${id}">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${idea.voteCount || 0} Votes</span>
                    </button>
                </div>
            </div>
            
            <div class="idea-comments">
                <h3>Comments (${idea.commentCount || 0})</h3>
                <div class="comments-list" id="comments-list-${id}">
                    <div class="comment-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading comments...</span>
                    </div>
                </div>
                <form class="comment-form" id="comment-form-${id}">
                    <textarea placeholder="Add your comment..." required></textarea>
                    <button type="submit" class="btn-primary">Post Comment</button>
                </form>
            </div>
        </div>
    `;
    
    // Add vote event listener
    const voteBtn = modalContent.querySelector('.vote-btn');
    voteBtn.addEventListener('click', () => handleVote(id));
    
    // Load comments
    loadComments(id);
    
    // Handle comment submission
    const commentForm = modalContent.querySelector(`#comment-form-${id}`);
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = commentForm.querySelector('textarea').value;
        postComment(id, content);
    });
    
    // Focus comment field if requested
    if (focusComment) {
        commentForm.querySelector('textarea').focus();
    }
}

// Handle voting
async function handleVote(ideaId) {
    if (!auth.currentUser) {
        alert('Please login to vote');
        document.getElementById('login-modal').style.display = 'block';
        return;
    }
    
    const userId = auth.currentUser.uid;
    const voteRef = db.collection('votes').doc(`${ideaId}_${userId}`);
    
    try {
        const voteDoc = await voteRef.get();
        
        if (voteDoc.exists) {
            // Remove vote
            await voteRef.delete();
            await db.collection('ideas').doc(ideaId).update({
                voteCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            // Update UI
            document.querySelectorAll(`.vote-btn[data-id="${ideaId}"]`).forEach(btn => {
                btn.classList.remove('active');
                const countSpan = btn.querySelector('span');
                countSpan.textContent = parseInt(countSpan.textContent) - 1;
            });
        } else {
            // Add vote
            await voteRef.set({
                ideaId,
                userId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('ideas').doc(ideaId).update({
                voteCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Update UI
            document.querySelectorAll(`.vote-btn[data-id="${ideaId}"]`).forEach(btn => {
                btn.classList.add('active');
                const countSpan = btn.querySelector('span');
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
            });
        }
    } catch (error) {
        console.error("Error handling vote:", error);
        alert('Error processing your vote');
    }
}

// Load comments
async function loadComments(ideaId) {
    const commentsList = document.getElementById(`comments-list-${ideaId}`);
    
    try {
        const snapshot = await db.collection('comments')
            .where('ideaId', '==', ideaId)
            .orderBy('createdAt', 'desc')
            .get();
        
        commentsList.innerHTML = '';
        
        if (snapshot.empty) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const comment = doc.data();
            commentsList.appendChild(createCommentElement(comment));
        });
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsList.innerHTML = '<p class="error">Error loading comments</p>';
    }
}

// Create comment element
function createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    
    const daysAgo = Math.floor((new Date() - comment.createdAt.toDate()) / (1000 * 60 * 60 * 24));
    
    commentEl.innerHTML = `
        <div class="comment-header">
            <img src="https://ui-avatars.com/api/?name=${comment.userName}&background=random" alt="${comment.userName}">
            <div>
                <h4>${comment.userName}</h4>
                <span>${daysAgo}d ago</span>
            </div>
            ${comment.userId === auth.currentUser?.uid ? 
                '<button class="delete-comment" data-id="' + comment.id + '"><i class="fas fa-trash"></i></button>' : ''}
        </div>
        <div class="comment-content">
            <p>${comment.content}</p>
        </div>
    `;
    
    // Add delete event listener if applicable
    const deleteBtn = commentEl.querySelector('.delete-comment');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteComment(comment.id, comment.ideaId));
    }
    
    return commentEl;
}

// Post comment
async function postComment(ideaId, content) {
    if (!auth.currentUser) {
        alert('Please login to comment');
        document.getElementById('login-modal').style.display = 'block';
        return;
    }
    
    const user = auth.currentUser;
    const commentsList = document.getElementById(`comments-list-${ideaId}`);
    const commentForm = document.getElementById(`comment-form-${ideaId}`);
    
    try {
        // Add comment
        const docRef = await db.collection('comments').add({
            ideaId,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update comment count
        await db.collection('ideas').doc(ideaId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Add comment to UI
        const comment = {
            id: docRef.id,
            ideaId,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            content,
            createdAt: new Date()
        };
        
        if (commentsList.querySelector('.no-comments')) {
            commentsList.innerHTML = '';
        }
        
        commentsList.prepend(createCommentElement(comment));
        
        // Update comment counts on cards
        document.querySelectorAll(`.comment-btn[data-id="${ideaId}"] span`).forEach(span => {
            span.textContent = parseInt(span.textContent) + 1;
        });
        
        // Clear form
        commentForm.querySelector('textarea').value = '';
    } catch (error) {
        console.error("Error posting comment:", error);
        alert('Error posting your comment');
    }
}

// Delete comment
async function deleteComment(commentId, ideaId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
        // Delete comment
        await db.collection('comments').doc(commentId).delete();
        
        // Update comment count
        await db.collection('ideas').doc(ideaId).update({
            commentCount: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Remove from UI
        document.querySelector(`.comment .delete-comment[data-id="${commentId}"]`)?.closest('.comment').remove();
        
        // Update comment counts on cards
        document.querySelectorAll(`.comment-btn[data-id="${ideaId}"] span`).forEach(span => {
            span.textContent = parseInt(span.textContent) - 1;
        });
    } catch (error) {
        console.error("Error deleting comment:", error);
        alert('Error deleting comment');
    }
}

// Load stats
async function loadStats() {
    try {
        // Total ideas
        const ideasSnapshot = await db.collection('ideas').count().get();
        totalIdeasCount.textContent = ideasSnapshot.data().count;
        
        // Implemented ideas
        const implementedSnapshot = await db.collection('ideas')
            .where('status', '==', 'Implemented')
            .count()
            .get();
        implementedCount.textContent = implementedSnapshot.data().count;
        
        // Active users (approximate)
        const usersSnapshot = await db.collection('users').count().get();
        activeUsers.textContent = usersSnapshot.data().count;
        
        // Efficiency gain (would need to calculate from implemented ideas)
        efficiencyGain.textContent = '15%';
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// Create skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'idea-card skeleton';
    return card;
}