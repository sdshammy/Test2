import { auth, db } from './firebase.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordLink = document.getElementById('forgot-password');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
const googleLoginBtn = document.querySelector('.google-btn');
const microsoftLoginBtn = document.querySelector('.microsoft-btn');

// Initialize auth UI
document.addEventListener('DOMContentLoaded', () => {
    // Toggle password visibility
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Forgot password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }

    // Social login buttons
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', signInWithGoogle);
    }

    if (microsoftLoginBtn) {
        microsoftLoginBtn.addEventListener('click', signInWithMicrosoft);
    }
});

// Toggle password visibility
function togglePasswordVisibility(e) {
    const button = e.currentTarget;
    const input = button.closest('.input-with-icon').querySelector('input');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me')?.checked;
    
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        // Set persistence based on "Remember me" selection
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        // Sign in with email/password
        const { user } = await auth.signInWithEmailAndPassword(email, password);
        
        // Redirect to home page after successful login
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showAuthError(error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const department = document.getElementById('register-department').value;
    const jobTitle = document.getElementById('register-job-title').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showAuthError({ message: 'Passwords do not match' });
        return;
    }
    
    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    
    try {
        // Create user with email/password
        const { user } = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update user profile with display name
        await user.updateProfile({
            displayName: name
        });
        
        // Save additional user data to Firestore
        await db.collection('users').doc(user.uid).set({
            name,
            email,
            department,
            jobTitle,
            role: 'user', // default role
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Redirect to home page after successful registration
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        showAuthError(error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Please enter your email address to reset your password:');
    if (!email) return;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent. Please check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        showAuthError(error);
    }
}

// Social login providers
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        await auth.signInWithPopup(provider);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Google sign-in error:', error);
        showAuthError(error);
    }
}

async function signInWithMicrosoft() {
    try {
        const provider = new firebase.auth.OAuthProvider('microsoft.com');
        provider.setCustomParameters({
            tenant: 'common',
            prompt: 'select_account'
        });
        
        await auth.signInWithPopup(provider);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Microsoft sign-in error:', error);
        showAuthError(error);
    }
}

// Show authentication errors
function showAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/email-already-in-use':
            message = 'This email is already registered.';
            break;
        case 'auth/weak-password':
            message = 'Password should be at least 6 characters.';
            break;
        case 'auth/operation-not-allowed':
            message = 'This operation is not allowed.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many requests. Please try again later.';
            break;
        default:
            message = error.message || message;
    }
    
    alert(message);
}