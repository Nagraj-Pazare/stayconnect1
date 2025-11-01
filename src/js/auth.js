// src/js/auth.js - FIXED
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Firebase to be ready
  window.addEventListener('firebaseReady', function() {
    console.log('auth.js: Firebase ready, initializing auth...');
    initializeAuth();
  });

  function initializeAuth() {
    // Register form
    const regForm = document.getElementById('registerForm');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        
        try {
          const result = await auth.createUserWithEmailAndPassword(email, password);
          showToast('Registered successfully!', 'success');
          setTimeout(() => window.location.href = 'index.html', 1000);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        try {
          const result = await auth.signInWithEmailAndPassword(email, password);
          showToast('Login successful!', 'success');
          setTimeout(() => window.location.href = 'index.html', 1000);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Update navbar auth state
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
      auth.onAuthStateChanged(user => {
        if (user) {
          loginLink.textContent = 'Logout';
          loginLink.href = '#';
          loginLink.onclick = async (e) => {
            e.preventDefault();
            await auth.signOut();
            window.location.href = 'index.html';
          };
        } else {
          loginLink.textContent = 'Login';
          loginLink.href = 'login.html';
          loginLink.onclick = null;
        }
      });
    }
  }
});