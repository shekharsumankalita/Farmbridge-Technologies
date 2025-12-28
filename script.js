/**
 * FarmBridge Technologies - Production Ready JavaScript
 * Version: 1.0.0
 * Last Updated: 2025-12-28
 * 
 * This script provides comprehensive functionality for the FarmBridge Technologies website
 * including navigation, animations, API interactions, and user engagement features.
 */

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  apiEndpoint: process.env.API_ENDPOINT || 'https://api.farmbridgetechnologies.com/v1',
  animationDuration: 300,
  scrollThreshold: 100,
  toastDuration: 3000,
  maxRetries: 3,
  retryDelay: 1000,
  debugMode: false
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logger utility for debugging and production monitoring
 */
const Logger = {
  log: (message, data = null) => {
    if (CONFIG.debugMode) {
      console.log(`[FarmBridge] ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    console.error(`[FarmBridge Error] ${message}`, error || '');
  },
  warn: (message, data = null) => {
    console.warn(`[FarmBridge Warning] ${message}`, data || '');
  }
};

/**
 * DOM utility functions
 */
const DOM = {
  query: (selector) => document.querySelector(selector),
  queryAll: (selector) => document.querySelectorAll(selector),
  addClass: (element, className) => element?.classList.add(className),
  removeClass: (element, className) => element?.classList.remove(className),
  toggleClass: (element, className) => element?.classList.toggle(className),
  hasClass: (element, className) => element?.classList.contains(className),
  setAttr: (element, attr, value) => element?.setAttribute(attr, value),
  getAttr: (element, attr) => element?.getAttribute(attr),
  setText: (element, text) => {
    if (element) element.textContent = text;
  },
  setHTML: (element, html) => {
    if (element) element.innerHTML = html;
  },
  create: (tag, className = '', innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
  }
};

/**
 * Event utility for managing event listeners
 */
const EventManager = {
  listeners: new Map(),
  
  on: (element, event, handler, options = {}) => {
    if (!element) return;
    const key = `${element.id || 'unnamed'}-${event}`;
    element.addEventListener(event, handler, options);
    EventManager.listeners.set(key, { element, event, handler, options });
    Logger.log(`Event listener added: ${key}`);
  },
  
  off: (element, event) => {
    if (!element) return;
    const key = `${element.id || 'unnamed'}-${event}`;
    const listener = EventManager.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(event, listener.handler, listener.options);
      EventManager.listeners.delete(key);
      Logger.log(`Event listener removed: ${key}`);
    }
  },
  
  delegate: (parent, event, selector, handler) => {
    if (!parent) return;
    EventManager.on(parent, event, (e) => {
      const target = e.target.closest(selector);
      if (target) handler.call(target, e);
    });
  }
};

/**
 * HTTP request utility with retry logic
 */
const API = {
  async request(method, endpoint, data = null, retries = 0) {
    try {
      const url = `${CONFIG.apiEndpoint}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retries < CONFIG.maxRetries) {
        Logger.warn(`Request failed, retrying... (${retries + 1}/${CONFIG.maxRetries})`, error.message);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        return API.request(method, endpoint, data, retries + 1);
      }
      Logger.error('API request failed', error);
      throw error;
    }
  },
  
  get: (endpoint) => API.request('GET', endpoint),
  post: (endpoint, data) => API.request('POST', endpoint, data),
  put: (endpoint, data) => API.request('PUT', endpoint, data),
  delete: (endpoint) => API.request('DELETE', endpoint)
};

/**
 * Local storage utility with JSON serialization
 */
const Storage = {
  set: (key, value, expiryMinutes = null) => {
    const data = { value };
    if (expiryMinutes) {
      data.expiry = Date.now() + (expiryMinutes * 60 * 1000);
    }
    localStorage.setItem(key, JSON.stringify(data));
    Logger.log(`Storage set: ${key}`);
  },
  
  get: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    try {
      const data = JSON.parse(item);
      if (data.expiry && Date.now() > data.expiry) {
        Storage.remove(key);
        return null;
      }
      return data.value;
    } catch (error) {
      Logger.error('Storage parse error', error);
      return null;
    }
  },
  
  remove: (key) => {
    localStorage.removeItem(key);
    Logger.log(`Storage removed: ${key}`);
  },
  
  clear: () => {
    localStorage.clear();
    Logger.log('Storage cleared');
  }
};

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

class Toast {
  constructor(message, type = 'info', duration = CONFIG.toastDuration) {
    this.message = message;
    this.type = type; // 'success', 'error', 'warning', 'info'
    this.duration = duration;
    this.element = null;
    this.init();
  }
  
  init() {
    const container = DOM.query('.toast-container') || this.createContainer();
    this.element = DOM.create('div', `toast toast-${this.type}`);
    this.element.innerHTML = `
      <span class="toast-message">${this.escapeHtml(this.message)}</span>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;
    
    container.appendChild(this.element);
    this.setupCloseButton();
    this.autoClose();
  }
  
  createContainer() {
    const container = DOM.create('div', 'toast-container');
    document.body.appendChild(container);
    return container;
  }
  
  setupCloseButton() {
    const closeBtn = this.element.querySelector('.toast-close');
    EventManager.on(closeBtn, 'click', () => this.close());
  }
  
  autoClose() {
    setTimeout(() => this.close(), this.duration);
  }
  
  close() {
    DOM.addClass(this.element, 'toast-exit');
    setTimeout(() => {
      this.element?.remove();
    }, CONFIG.animationDuration);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const Notification = {
  success: (message) => new Toast(message, 'success'),
  error: (message) => new Toast(message, 'error'),
  warning: (message) => new Toast(message, 'warning'),
  info: (message) => new Toast(message, 'info')
};

// ============================================================================
// NAVIGATION & SCROLL HANDLING
// ============================================================================

class Navigation {
  constructor() {
    this.navbar = DOM.query('nav');
    this.menuToggle = DOM.query('[data-menu-toggle]');
    this.menu = DOM.query('[data-menu]');
    this.menuLinks = DOM.queryAll('[data-menu] a');
    this.scrollThreshold = CONFIG.scrollThreshold;
    this.init();
  }
  
  init() {
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupScrollEffect();
    Logger.log('Navigation initialized');
  }
  
  setupMobileMenu() {
    if (this.menuToggle) {
      EventManager.on(this.menuToggle, 'click', () => this.toggleMenu());
    }
    
    this.menuLinks.forEach(link => {
      EventManager.on(link, 'click', () => this.closeMenu());
    });
  }
  
  toggleMenu() {
    DOM.toggleClass(this.menu, 'menu-open');
    DOM.toggleClass(this.menuToggle, 'menu-toggle-active');
  }
  
  closeMenu() {
    DOM.removeClass(this.menu, 'menu-open');
    DOM.removeClass(this.menuToggle, 'menu-toggle-active');
  }
  
  setupSmoothScroll() {
    EventManager.delegate(document, 'click', 'a[href^="#"]', (e) => {
      const target = e.target.getAttribute('href');
      if (target === '#') return;
      
      const section = DOM.query(target);
      if (section) {
        e.preventDefault();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.closeMenu();
      }
    });
  }
  
  setupScrollEffect() {
    let ticking = false;
    
    EventManager.on(window, 'scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateScrollState();
          ticking = false;
        });
        ticking = true;
      }
    });
  }
  
  updateScrollState() {
    const scrolled = window.scrollY > this.scrollThreshold;
    if (scrolled) {
      DOM.addClass(this.navbar, 'navbar-scrolled');
    } else {
      DOM.removeClass(this.navbar, 'navbar-scrolled');
    }
  }
}

// ============================================================================
// FORM HANDLING & VALIDATION
// ============================================================================

class FormValidator {
  constructor(form) {
    this.form = form;
    this.errors = {};
    this.init();
  }
  
  init() {
    EventManager.on(this.form, 'submit', (e) => this.handleSubmit(e));
    this.setupFieldValidation();
  }
  
  setupFieldValidation() {
    const fields = this.form.querySelectorAll('[data-validate]');
    fields.forEach(field => {
      EventManager.on(field, 'blur', () => this.validateField(field));
      EventManager.on(field, 'input', () => this.clearFieldError(field));
    });
  }
  
  validateField(field) {
    const rules = field.getAttribute('data-validate')?.split('|') || [];
    const value = field.value.trim();
    
    for (const rule of rules) {
      const [ruleName, ...params] = rule.split(':');
      
      if (!this.checkRule(ruleName, value, params)) {
        this.setFieldError(field, this.getErrorMessage(ruleName, field.name));
        return false;
      }
    }
    
    this.clearFieldError(field);
    return true;
  }
  
  checkRule(rule, value, params = []) {
    switch (rule) {
      case 'required':
        return value.length > 0;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^\d{10,}$/.test(value.replace(/\D/g, ''));
      case 'minlength':
        return value.length >= parseInt(params[0]);
      case 'maxlength':
        return value.length <= parseInt(params[0]);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }
  
  setFieldError(field, message) {
    DOM.addClass(field, 'field-error');
    this.errors[field.name] = message;
    let errorElement = field.parentElement.querySelector('.error-message');
    if (!errorElement) {
      errorElement = DOM.create('span', 'error-message');
      field.parentElement.appendChild(errorElement);
    }
    DOM.setText(errorElement, message);
  }
  
  clearFieldError(field) {
    DOM.removeClass(field, 'field-error');
    delete this.errors[field.name];
    const errorElement = field.parentElement.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }
  
  getErrorMessage(rule, fieldName) {
    const messages = {
      required: `${fieldName} is required`,
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid phone number',
      minlength: 'Input is too short',
      maxlength: 'Input is too long',
      url: 'Please enter a valid URL'
    };
    return messages[rule] || 'Invalid input';
  }
  
  handleSubmit(e) {
    e.preventDefault();
    this.errors = {};
    
    const fields = this.form.querySelectorAll('[data-validate]');
    let isValid = true;
    
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    if (isValid) {
      this.submitForm();
    } else {
      Notification.error('Please fix the errors in the form');
    }
  }
  
  async submitForm() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    
    try {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      DOM.setText(submitBtn, 'Sending...');
      DOM.setAttr(submitBtn, 'disabled', 'true');
      
      const endpoint = this.form.getAttribute('data-endpoint') || '/contact';
      const response = await API.post(endpoint, data);
      
      Notification.success('Form submitted successfully!');
      this.form.reset();
      
      // Store submission data
      Storage.set(`form_submission_${Date.now()}`, data, 60);
      
      Logger.log('Form submitted', response);
    } catch (error) {
      Notification.error('Failed to submit form. Please try again.');
      Logger.error('Form submission failed', error);
    } finally {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      DOM.setText(submitBtn, 'Submit');
      DOM.setAttr(submitBtn, 'disabled', 'false');
    }
  }
}

// ============================================================================
// MODAL DIALOG
// ============================================================================

class Modal {
  constructor(id, options = {}) {
    this.id = id;
    this.element = DOM.query(`#${id}`);
    this.options = { closeOnEscape: true, closeOnBackdrop: true, ...options };
    this.isOpen = false;
    this.init();
  }
  
  init() {
    if (!this.element) return;
    
    const closeBtn = this.element.querySelector('[data-close]');
    if (closeBtn) {
      EventManager.on(closeBtn, 'click', () => this.close());
    }
    
    if (this.options.closeOnBackdrop) {
      EventManager.on(this.element, 'click', (e) => {
        if (e.target === this.element) this.close();
      });
    }
    
    if (this.options.closeOnEscape) {
      EventManager.on(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    }
    
    Logger.log(`Modal initialized: ${this.id}`);
  }
  
  open() {
    if (!this.element) return;
    DOM.addClass(this.element, 'modal-open');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    Logger.log(`Modal opened: ${this.id}`);
  }
  
  close() {
    if (!this.element) return;
    DOM.removeClass(this.element, 'modal-open');
    document.body.style.overflow = '';
    this.isOpen = false;
    Logger.log(`Modal closed: ${this.id}`);
  }
  
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
}

// ============================================================================
// LAZY LOADING & IMAGES
// ============================================================================

class LazyLoader {
  constructor() {
    this.images = DOM.queryAll('img[data-src]');
    this.init();
  }
  
  init() {
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      this.loadAllImages();
    }
    Logger.log('LazyLoader initialized');
  }
  
  setupIntersectionObserver() {
    const imageMap = new WeakMap();
    
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    this.images.forEach(img => {
      observer.observe(img);
      imageMap.set(img, true);
    });
  }
  
  loadImage(img) {
    const src = img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      DOM.addClass(img, 'image-loaded');
      Logger.log(`Image loaded: ${src}`);
    }
  }
  
  loadAllImages() {
    this.images.forEach(img => this.loadImage(img));
  }
}

// ============================================================================
// ANALYTICS & TRACKING
// ============================================================================

class Analytics {
  static trackEvent(category, action, label = '', value = 0) {
    const event = {
      timestamp: new Date().toISOString(),
      category,
      action,
      label,
      value,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    Logger.log('Event tracked', event);
    
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
    
    // Store locally
    Storage.set(`analytics_${Date.now()}`, event, 1440); // 24 hours
  }
  
  static trackPageView() {
    Analytics.trackEvent('pageview', 'page_view', window.location.pathname);
  }
  
  static trackFormInteraction(formName, action) {
    Analytics.trackEvent('form', action, formName);
  }
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

class Animation {
  static fadeIn(element, duration = CONFIG.animationDuration) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in`;
    
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);
  }
  
  static slideDown(element, duration = CONFIG.animationDuration) {
    if (!element) return;
    element.style.maxHeight = '0';
    element.style.overflow = 'hidden';
    element.style.transition = `max-height ${duration}ms ease-out`;
    
    setTimeout(() => {
      element.style.maxHeight = element.scrollHeight + 'px';
    }, 10);
  }
  
  static slideUp(element, duration = CONFIG.animationDuration) {
    if (!element) return;
    element.style.transition = `max-height ${duration}ms ease-in`;
    element.style.maxHeight = '0';
  }
  
  static shake(element, duration = 300) {
    if (!element) return;
    const keyframes = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
    `;
    
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    element.style.animation = `shake ${duration}ms`;
    setTimeout(() => {
      element.style.animation = '';
    }, duration);
  }
}

// ============================================================================
// ACCORDION COMPONENT
// ============================================================================

class Accordion {
  constructor(container) {
    this.container = container;
    this.items = container.querySelectorAll('[data-accordion-item]');
    this.init();
  }
  
  init() {
    this.items.forEach(item => {
      const header = item.querySelector('[data-accordion-header]');
      if (header) {
        EventManager.on(header, 'click', () => this.toggle(item));
      }
    });
    Logger.log('Accordion initialized');
  }
  
  toggle(item) {
    const isOpen = DOM.hasClass(item, 'accordion-open');
    
    if (isOpen) {
      this.close(item);
    } else {
      // Close other items
      this.items.forEach(otherItem => {
        if (otherItem !== item && DOM.hasClass(otherItem, 'accordion-open')) {
          this.close(otherItem);
        }
      });
      this.open(item);
    }
  }
  
  open(item) {
    DOM.addClass(item, 'accordion-open');
    const content = item.querySelector('[data-accordion-content]');
    if (content) {
      Animation.slideDown(content);
    }
  }
  
  close(item) {
    DOM.removeClass(item, 'accordion-open');
    const content = item.querySelector('[data-accordion-content]');
    if (content) {
      Animation.slideUp(content);
    }
  }
}

// ============================================================================
// TABS COMPONENT
// ============================================================================

class Tabs {
  constructor(container) {
    this.container = container;
    this.tabs = container.querySelectorAll('[data-tab]');
    this.panels = container.querySelectorAll('[data-tab-panel]');
    this.init();
  }
  
  init() {
    this.tabs.forEach((tab, index) => {
      EventManager.on(tab, 'click', () => this.activate(index));
      
      // Keyboard navigation
      EventManager.on(tab, 'keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (index + 1) % this.tabs.length;
          this.tabs[nextIndex].focus();
          this.activate(nextIndex);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = (index - 1 + this.tabs.length) % this.tabs.length;
          this.tabs[prevIndex].focus();
          this.activate(prevIndex);
        }
      });
    });
    
    // Activate first tab
    this.activate(0);
    Logger.log('Tabs initialized');
  }
  
  activate(index) {
    // Deactivate all tabs and panels
    this.tabs.forEach(tab => DOM.removeClass(tab, 'tab-active'));
    this.panels.forEach(panel => DOM.removeClass(panel, 'tab-panel-active'));
    
    // Activate selected tab and panel
    DOM.addClass(this.tabs[index], 'tab-active');
    DOM.addClass(this.panels[index], 'tab-panel-active');
    
    Analytics.trackEvent('ui', 'tab_activated', `tab_${index}`);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  Logger.log('FarmBridge Technologies script initializing...');
  
  try {
    // Initialize core components
    const nav = new Navigation();
    
    // Initialize all forms
    document.querySelectorAll('form[data-validate]').forEach(form => {
      new FormValidator(form);
    });
    
    // Initialize modals
    document.querySelectorAll('[data-modal]').forEach(modal => {
      const modalId = modal.id;
      const modalInstance = new Modal(modalId);
      
      // Setup trigger buttons
      document.querySelectorAll(`[data-modal-trigger="${modalId}"]`).forEach(trigger => {
        EventManager.on(trigger, 'click', () => modalInstance.open());
      });
    });
    
    // Initialize accordions
    document.querySelectorAll('[data-accordion]').forEach(accordion => {
      new Accordion(accordion);
    });
    
    // Initialize tabs
    document.querySelectorAll('[data-tabs]').forEach(tabs => {
      new Tabs(tabs);
    });
    
    // Initialize lazy loading
    const lazyLoader = new LazyLoader();
    
    // Track page view
    Analytics.trackPageView();
    
    // Setup global error handling
    window.addEventListener('error', (event) => {
      Logger.error('Global error', event.error);
      if (!CONFIG.debugMode) {
        // Send error to monitoring service
        API.post('/errors', {
          message: event.error.message,
          stack: event.error.stack,
          url: window.location.href
        }).catch(e => Logger.error('Failed to report error', e));
      }
    });
    
    // Setup unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      Logger.error('Unhandled promise rejection', event.reason);
    });
    
    Logger.log('All components initialized successfully');
  } catch (error) {
    Logger.error('Initialization failed', error);
  }
});

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

if (window.performance && window.performance.timing) {
  window.addEventListener('load', () => {
    const timing = window.performance.timing;
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    
    Logger.log(`Page load time: ${pageLoadTime}ms`);
    
    // Log performance metrics
    if (window.performance.getEntriesByType) {
      const perfEntries = window.performance.getEntriesByType('navigation')[0];
      if (perfEntries) {
        Logger.log('Performance metrics', {
          dns: perfEntries.domainLookupEnd - perfEntries.domainLookupStart,
          tcp: perfEntries.connectEnd - perfEntries.connectStart,
          ttfb: perfEntries.responseStart - perfEntries.navigationStart,
          download: perfEntries.responseEnd - perfEntries.responseStart,
          domInteractive: perfEntries.domInteractive - perfEntries.navigationStart,
          domComplete: perfEntries.domComplete - perfEntries.navigationStart
        });
      }
    }
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

window.FarmBridge = {
  config: CONFIG,
  logger: Logger,
  dom: DOM,
  events: EventManager,
  api: API,
  storage: Storage,
  notification: Notification,
  modal: (id) => new Modal(id),
  accordion: (element) => new Accordion(element),
  tabs: (element) => new Tabs(element),
  analytics: Analytics,
  animation: Animation,
  version: '1.0.0'
};

// Enable debug mode if query parameter is present
if (new URLSearchParams(window.location.search).has('debug')) {
  CONFIG.debugMode = true;
  Logger.log('Debug mode enabled');
}