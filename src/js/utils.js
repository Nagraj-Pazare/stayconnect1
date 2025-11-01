// src/js/utils.js - ENHANCED VERSION
window.showToast = function(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // Add styles if not already added
  if (!document.querySelector('#toast-styles')) {
    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        border-left: 4px solid #2563eb;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
      }
      .toast-success { border-left-color: #10b981; }
      .toast-error { border-left-color: #ef4444; }
      .toast-warning { border-left-color: #f59e0b; }
      .toast-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .toast-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
};

// Loading spinner utility
window.showLoading = function(element) {
  element.innerHTML = '<div class="loading"></div>';
  element.disabled = true;
};

window.hideLoading = function(element, originalText) {
  element.innerHTML = originalText;
  element.disabled = false;
};

// Price formatter
window.formatPrice = function(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

// Phone number formatter
window.formatPhone = function(phone) {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};