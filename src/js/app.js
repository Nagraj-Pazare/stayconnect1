// src/js/app.js - FIXED VERSION
(function () {
  const sdkUrls = [
    "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage-compat.js"
  ];

  let firebaseInitialized = false;

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${url}"]`)) {
        console.log(`Script already loaded: ${url}`);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        console.log(`✅ Loaded: ${url}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ Failed to load: ${url}`);
        reject(new Error(`Failed to load ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadFirebaseSDKs() {
    console.log('📦 Loading Firebase SDKs...');
    
    for (const url of sdkUrls) {
      try {
        await loadScript(url);
        // Small delay between loads
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`Failed to load ${url}, continuing...`, error);
      }
    }

    // Wait for Firebase to be available
    let attempts = 0;
    while (typeof firebase === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not available after loading scripts');
    }

    console.log('✅ All Firebase SDKs loaded');
  }

  function initializeFirebaseApp() {
    console.log('🚀 Initializing Firebase app...');
    
    // Check if config exists
    if (!window.firebaseConfig) {
      throw new Error('firebaseConfig not found. Make sure config/firebaseConfig.js is loaded first');
    }

    console.log('📋 Firebase config found:', window.firebaseConfig.projectId);

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase app initialized');
    } else {
      console.log('ℹ️ Firebase app already initialized');
    }

    // Initialize services
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    
    console.log('✅ Firebase services initialized:');
    console.log('   - Auth:', !!window.auth);
    console.log('   - Firestore:', !!window.db);
    console.log('   - Storage:', !!window.storage);

    firebaseInitialized = true;

    // Dispatch ready event
    const event = new Event('firebaseReady');
    window.dispatchEvent(event);
    console.log('🎉 Firebase fully ready!');
  }

  async function initialize() {
    try {
      console.log('🔧 Starting Firebase initialization...');
      
      // Load SDKs first
      await loadFirebaseSDKs();
      
      // Then initialize the app
      initializeFirebaseApp();
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      
      // Show user-friendly error
      if (typeof showToast === 'function') {
        showToast('Failed to initialize app. Please refresh the page.', 'error');
      }
      
      // Show error in UI
      const errorElement = document.createElement('div');
      errorElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ef4444;
        color: white;
        padding: 1rem;
        text-align: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      errorElement.innerHTML = `
        <strong>App Initialization Error</strong><br>
        Failed to load Firebase. Please check your internet connection and refresh the page.
        <button onclick="this.parentElement.remove()" style="margin-left: 1rem; background: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">
          ×
        </button>
      `;
      document.body.appendChild(errorElement);
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();