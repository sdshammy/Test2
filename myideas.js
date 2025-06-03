// Initialize Firebase (make sure firebase.js is properly configured)
document.addEventListener('DOMContentLoaded', function() {
    // Check auth state
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            document.getElementById('username').textContent = user.displayName || user.email;
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('register-btn').style.display = 'none';
            document.getElementById('profile-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
            
            // Load user's ideas
            loadUserIdeas(user.uid);
            
            // Set up event listeners
            setupEventListeners(user.uid);
        } else {
            // No user is signed in
            window.location.href = 'login.html';
        }
    });
});

// Set up event listeners
function setupEventListeners(userId) {
    // Filter and sort controls
    document.getElementById('status-filter').addEventListener('change', function() {
        loadUserIdeas(userId);
    });
    
    document.getElementById('sort-ideas').addEventListener('change', function() {
        loadUserIdeas(userId);
    });
    
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('status-filter').value = 'all';
        document.getElementById('sort-ideas').value = 'newest';
        loadUserIdeas(userId);
    });
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    });
    
    // Load more button
    document.getElementById('load-more-btn').addEventListener('click', function() {
        loadMoreIdeas(userId);
    });
}

let lastVisible = null;
let allIdeasLoaded = false;

// Load user's ideas with filters
function loadUserIdeas(userId) {
    const db = firebase.firestore();
    const ideasContainer = document.getElementById('ideas-container');
    const emptyState = document.getElementById('empty-state');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // Reset pagination
    lastVisible = null;
    allIdeasLoaded = false;
    
    // Show loading state
    ideasContainer.innerHTML = `
        <div class="loading-placeholder">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    
    // Get filter values
    const statusFilter = document.getElementById('status-filter').value;
    const sortBy = document.getElementById('sort-ideas').value;
    
    // Build query
    let query = db.collection('ideas')
        .where('authorId', '==', userId)
        .limit(10);
    
    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter);
    }
    
    // Apply sorting
    if (sortBy === 'newest') {
        query = query.orderBy('timestamp', 'desc');
    } else if (sortBy === 'oldest') {
        query = query.orderBy('timestamp', 'asc');
    } else if (sortBy === 'votes') {
        query = query.orderBy('votes', 'desc');
    } else if (sortBy === 'comments') {
        query = query.orderBy('commentCount', 'desc');
    }
    
    // Execute query
    query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            ideasContainer.innerHTML = '';
            emptyState.style.display = 'block';
            loadMoreContainer.style.display = 'none';
            updateStats(userId);
            return;
        }
        
        // Process ideas
        ideasContainer.innerHTML = '';
        emptyState.style.display = 'none';
        
        querySnapshot.forEach((doc) => {
            displayIdea(doc.data(), doc.id);
        });
        
        // Update last visible for pagination
        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Show/hide load more button
        if (querySnapshot.size < 10) {
            allIdeasLoaded = true;
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }
        
        // Update stats
        updateStats(userId);
    }).catch((error) => {
        console.error("Error getting ideas: ", error);
        ideasContainer.innerHTML = '<p>Error loading ideas. Please try again.</p>';
    });
}

// Load more ideas for pagination
function loadMoreIdeas(userId) {
    if (allIdeasLoaded) return;
    
    const db = firebase.firestore();
    const ideasContainer = document.getElementById('ideas-container');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // Disable button during load
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
    
    // Get filter values
    const statusFilter = document.getElementById('status-filter').value;
    const sortBy = document.getElementById('sort-ideas').value;
    
    // Build query
    let query = db.collection('ideas')
        .where('authorId', '==', userId)
        .startAfter(lastVisible)
        .limit(10);
    
    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter);
    }
    
    // Apply sorting
    if (sortBy === 'newest') {
        query = query.orderBy('timestamp', 'desc');
    } else if (sortBy === 'oldest') {
        query = query.orderBy('timestamp', 'asc');
    } else if (sortBy === 'votes') {
        query = query.orderBy('votes', 'desc');
    } else if (sortBy === 'comments') {
        query = query.orderBy('commentCount', 'desc');
    }
    
    // Execute query
    query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            allIdeasLoaded = true;
            loadMoreContainer.style.display = 'none';
            return;
        }
        
        // Process ideas
        querySnapshot.forEach((doc) => {
            displayIdea(doc.data(), doc.id);
        });
        
        // Update last visible for pagination
        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Show/hide load more button
        if (querySnapshot.size < 10) {
            allIdeasLoaded = true;
            loadMoreContainer.style.display = 'none';
        }
        
        // Reset button
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Ideas';
    }).catch((error) => {
        console.error("Error getting more ideas: ", error);
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Ideas';
    });
}

// Display an idea card
function displayIdea(idea, ideaId) {
    const ideasContainer = document.getElementById('ideas-container');
    
    const ideaCard = document.createElement('div');
    ideaCard.className = 'idea-card';
    ideaCard.dataset.id = ideaId;
    
    ideaCard.innerHTML = `
        <div class="idea-header">
            <h3 class="idea-title">${idea.title}</h3>
            <span class="idea-status ${idea.status}">${idea.status.replace('-', ' ').toUpperCase()}</span>
        </div>
        <div class="idea-description">${idea.description.substring(0, 200)}${idea.description.length > 200 ? '...' : ''}</div>
        <div class="idea-footer">
            <div class="idea-meta">
                <span><i class="fas fa-calendar-alt"></i> ${new Date(idea.timestamp.toDate()).toLocaleDateString()}</span>
                <span><i class="fas fa-thumbs-up"></i> ${idea.votes || 0}</span>
                <span><i class="fas fa-comments"></i> ${idea.commentCount || 0}</span>
            </div>
            <div class="idea-actions">
                <button class="btn-small btn-edit" data-id="${ideaId}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-small btn-delete" data-id="${ideaId}"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `;
    
    ideasContainer.appendChild(ideaCard);
    
    // Add event listeners to action buttons
    ideaCard.querySelector('.btn-edit').addEventListener('click', function() {
        editIdea(ideaId);
    });
    
    ideaCard.querySelector('.btn-delete').addEventListener('click', function() {
        deleteIdea(ideaId);
    });
}

// Update stats counters
function updateStats(userId) {
    const db = firebase.firestore();
    
    // Total ideas count
    let totalQuery = db.collection('ideas').where('authorId', '==', userId);
    const statusFilter = document.getElementById('status-filter').value;
    
    if (statusFilter !== 'all') {
        totalQuery = totalQuery.where('status', '==', statusFilter);
    }
    
    totalQuery.get().then((querySnapshot) => {
        document.getElementById('total-ideas').textContent = querySnapshot.size;
        
        // Calculate total votes and comments
        let totalVotes = 0;
        let totalComments = 0;
        let implementedCount = 0;
        
        querySnapshot.forEach((doc) => {
            const idea = doc.data();
            totalVotes += idea.votes || 0;
            totalComments += idea.commentCount || 0;
            if (idea.status === 'implemented') {
                implementedCount++;
            }
        });
        
        document.getElementById('total-votes').textContent = totalVotes;
        document.getElementById('total-comments').textContent = totalComments;
        document.getElementById('implemented-ideas').textContent = implementedCount;
    });
}

// Edit idea function
function editIdea(ideaId) {
    // You would implement this to open an edit modal or redirect to an edit page
    console.log('Edit idea:', ideaId);
    // window.location.href = `edit-idea.html?id=${ideaId}`;
}

// Delete idea function
function deleteIdea(ideaId) {
    if (confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
        const db = firebase.firestore();
        
        db.collection('ideas').doc(ideaId).delete().then(() => {
            // Remove from UI
            document.querySelector(`.idea-card[data-id="${ideaId}"]`).remove();
            
            // Check if we need to show empty state
            const ideasContainer = document.getElementById('ideas-container');
            if (ideasContainer.children.length === 0) {
                document.getElementById('empty-state').style.display = 'block';
            }
            
            // Update stats
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    updateStats(user.uid);
                }
            });
        }).catch((error) => {
            console.error("Error deleting idea: ", error);
            alert('Error deleting idea. Please try again.');
        });
    }
}