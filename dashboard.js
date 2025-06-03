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
            
            // Load dashboard data
            loadDashboardData();
        } else {
            // No user is signed in
            window.location.href = 'login.html';
        }
    });

    // Logout button functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    });
});

// Load all dashboard data
function loadDashboardData() {
    const db = firebase.firestore();
    
    // Load summary data
    loadSummaryData(db);
    
    // Load charts
    loadCharts(db);
    
    // Load recent activity
    loadRecentActivity(db);
    
    // Load top ideas
    loadTopIdeas(db);
}

// Load summary statistics
function loadSummaryData(db) {
    // Total ideas count
    db.collection('ideas').get().then((querySnapshot) => {
        document.getElementById('total-ideas').textContent = querySnapshot.size;
    });
    
    // Implemented ideas count
    db.collection('ideas').where('status', '==', 'implemented').get().then((querySnapshot) => {
        document.getElementById('implemented-ideas').textContent = querySnapshot.size;
    });
    
    // Active users count
    db.collection('users').get().then((querySnapshot) => {
        document.getElementById('active-users').textContent = querySnapshot.size;
    });
    
    // Top rated idea
    db.collection('ideas').orderBy('votes', 'desc').limit(1).get().then((querySnapshot) => {
        if (!querySnapshot.empty) {
            const idea = querySnapshot.docs[0].data();
            document.getElementById('top-rated-idea').textContent = idea.title;
        }
    });
}

// Load and render charts
function loadCharts(db) {
    // Ideas by status chart
    db.collection('ideas').get().then((querySnapshot) => {
        const statusCounts = {
            'submitted': 0,
            'under-review': 0,
            'approved': 0,
            'implemented': 0,
            'rejected': 0
        };
        
        querySnapshot.forEach((doc) => {
            const status = doc.data().status || 'submitted';
            statusCounts[status]++;
        });
        
        renderStatusChart(statusCounts);
    });
    
    // Ideas by department chart
    db.collection('ideas').get().then((querySnapshot) => {
        const departmentCounts = {};
        
        querySnapshot.forEach((doc) => {
            const department = doc.data().department || 'Other';
            departmentCounts[department] = (departmentCounts[department] || 0) + 1;
        });
        
        renderDepartmentChart(departmentCounts);
    });
}

// Render status chart
function renderStatusChart(statusCounts) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts).map(s => s.replace('-', ' ').toUpperCase()),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#3498db',
                    '#f39c12',
                    '#2ecc71',
                    '#9b59b6',
                    '#e74c3c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render department chart
function renderDepartmentChart(departmentCounts) {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    const departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(departmentCounts),
            datasets: [{
                label: 'Ideas by Department',
                data: Object.values(departmentCounts),
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Load recent activity
function loadRecentActivity(db) {
    const activityFeed = document.getElementById('activity-feed');
    
    db.collection('activity')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then((querySnapshot) => {
            activityFeed.innerHTML = '';
            
            if (querySnapshot.empty) {
                activityFeed.innerHTML = '<p>No recent activity found.</p>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const activity = doc.data();
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                // Determine icon based on activity type
                let iconClass = 'fa-lightbulb';
                if (activity.type === 'comment') iconClass = 'fa-comment';
                if (activity.type === 'vote') iconClass = 'fa-thumbs-up';
                if (activity.type === 'status-change') iconClass = 'fa-sync-alt';
                
                activityItem.innerHTML = `
                    <div class="activity-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <div class="activity-time">${new Date(activity.timestamp.toDate()).toLocaleString()}</div>
                    </div>
                `;
                
                activityFeed.appendChild(activityItem);
            });
        });
}

// Load top ideas
function loadTopIdeas(db) {
    const topIdeasContainer = document.getElementById('top-ideas-container');
    
    db.collection('ideas')
        .orderBy('votes', 'desc')
        .limit(5)
        .get()
        .then((querySnapshot) => {
            topIdeasContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                topIdeasContainer.innerHTML = '<p>No ideas found.</p>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const idea = doc.data();
                const ideaCard = document.createElement('div');
                ideaCard.className = 'idea-card';
                
                ideaCard.innerHTML = `
                    <div class="idea-header">
                        <h3>${idea.title}</h3>
                        <span class="idea-votes"><i class="fas fa-thumbs-up"></i> ${idea.votes || 0}</span>
                    </div>
                    <div class="idea-body">
                        <p>${idea.description.substring(0, 100)}...</p>
                    </div>
                    <div class="idea-footer">
                        <span class="idea-author">By: ${idea.authorName}</span>
                        <span class="idea-status ${idea.status}">${idea.status.replace('-', ' ').toUpperCase()}</span>
                    </div>
                `;
                
                topIdeasContainer.appendChild(ideaCard);
            });
        });
}