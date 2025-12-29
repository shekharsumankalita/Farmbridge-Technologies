/**
 * Farmbridge Technologies - Advanced 3D Interactive Experience
 * Features: Three.js scene, floating particles, parallax scrolling, camera animation, mobile optimization
 * Created: 2025-12-29
 */

class FarmbridgeVisualization {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = [];
    this.particleSystem = null;
    this.isMobile = this.detectMobile();
    this.scrollProgress = 0;
    this.initialized = false;
    this.animationId = null;
    
    // Configuration
    this.config = {
      particleCount: this.isMobile ? 500 : 1000,
      particleSize: this.isMobile ? 1.5 : 2,
      enableShadows: !this.isMobile,
      pixelRatio: this.isMobile ? 0.75 : 1,
      parallaxIntensity: 0.5,
      cameraDistance: 100
    };

    this.init();
  }

  /**
   * Detect mobile device
   */
  detectMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) 
           || window.matchMedia('(max-width: 768px)').matches;
  }

  /**
   * Initialize Three.js scene
   */
  init() {
    try {
      // Check WebGL support with fallback
      if (!this.isWebGLSupported()) {
        this.handleWebGLFallback();
        return;
      }

      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupLighting();
      this.createParticles();
      this.createGeometries();
      this.setupEventListeners();
      this.setupScrollListener();
      
      this.initialized = true;
      this.animate();
      
      console.log('✓ Farmbridge 3D Scene initialized successfully');
    } catch (error) {
      console.error('✗ Initialization error:', error);
      this.handleWebGLFallback();
    }
  }

  /**
   * Check WebGL support
   */
  isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!ctx;
    } catch {
      return false;
    }
  }

  /**
   * Setup scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.Fog(0x0a0e27, 200, 1000);
  }

  /**
   * Setup camera with responsive sizing
   */
  setupCamera() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.z = this.config.cameraDistance;
  }

  /**
   * Setup renderer with optimization
   */
  setupRenderer() {
    const canvas = document.createElement('canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: !this.isMobile,
      alpha: true,
      precision: this.isMobile ? 'lowp' : 'highp',
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.pixelRatio));
    this.renderer.shadowMap.enabled = this.config.enableShadows;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Insert canvas into DOM
    const container = document.getElementById('three-container') || document.body;
    container.appendChild(this.renderer.domElement);
  }

  /**
   * Setup lighting system
   */
  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = this.config.enableShadows;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 500;
    this.scene.add(directionalLight);

    // Point light for accent
    const pointLight = new THREE.PointLight(0x4ecca3, 0.5, 100);
    pointLight.position.set(-50, 50, 50);
    this.scene.add(pointLight);
  }

  /**
   * Create floating particles system
   */
  createParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      // Random positions
      positions.push(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );

      // Color gradient from green to cyan
      const hue = 0.4 + Math.random() * 0.2; // Green to cyan range
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      colors.push(color.r, color.g, color.b);

      // Size variation
      sizes.push(this.config.particleSize * (0.5 + Math.random() * 1));
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));

    // Particle material
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        texture: { value: new THREE.TextureLoader().load('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="white"/></svg>') }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D texture;
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, 0.8);
          gl_FragColor = gl_FragColor * texture2D(texture, gl_PointCoord);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      transparent: true
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);

    // Store particle data for animation
    this.particlePositions = positions;
    this.particleVelocities = new Float32Array(this.config.particleCount * 3);
    for (let i = 0; i < this.particleVelocities.length; i++) {
      this.particleVelocities[i] = (Math.random() - 0.5) * 0.05;
    }
  }

  /**
   * Create decorative geometries
   */
  createGeometries() {
    // Central rotating torus
    const torusGeometry = new THREE.TorusGeometry(30, 8, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecca3,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x1a5c4a,
      emissiveIntensity: 0.3
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.z = -50;
    torus.castShadow = this.config.enableShadows;
    torus.receiveShadow = this.config.enableShadows;
    this.scene.add(torus);

    // Octahedron backdrop
    const octaGeometry = new THREE.OctahedronGeometry(20, 3);
    const octaMaterial = new THREE.MeshPhongMaterial({
      color: 0x00d4aa,
      wireframe: false,
      emissive: 0x004d3d,
      emissiveIntensity: 0.2
    });
    const octahedron = new THREE.Mesh(octaGeometry, octaMaterial);
    octahedron.position.set(-60, 40, -100);
    octahedron.castShadow = this.config.enableShadows;
    this.scene.add(octahedron);

    // Floating cube
    const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a9d7f,
      metalness: 0.5,
      roughness: 0.4
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(60, -20, -80);
    cube.castShadow = this.config.enableShadows;
    this.scene.add(cube);

    // Store for animation
    this.torus = torus;
    this.octahedron = octahedron;
    this.cube = cube;
  }

  /**
   * Setup window event listeners
   */
  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
  }

  /**
   * Setup scroll listener for parallax and camera animation
   */
  setupScrollListener() {
    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
      this.updateCameraOnScroll();
      this.updateParallax();
    }, { passive: true });
  }

  /**
   * Update camera position and rotation on scroll
   */
  updateCameraOnScroll() {
    const maxRotation = Math.PI * 2;
    const maxZoom = 150;
    const minZoom = 50;

    // Smooth camera rotation
    this.camera.rotation.x = this.scrollProgress * maxRotation * 0.3;
    this.camera.rotation.y = this.scrollProgress * maxRotation * 0.5;

    // Smooth zoom effect
    this.camera.position.z = minZoom + (maxZoom - minZoom) * (1 - this.scrollProgress);

    // Subtle position shift
    this.camera.position.x = Math.sin(this.scrollProgress * Math.PI * 2) * 20;
    this.camera.position.y = Math.cos(this.scrollProgress * Math.PI * 2) * 20;
  }

  /**
   * Apply parallax scrolling effect to objects
   */
  updateParallax() {
    if (this.torus) {
      this.torus.position.y = Math.sin(this.scrollProgress * Math.PI * 4) * 30 * this.config.parallaxIntensity;
      this.torus.position.x = Math.cos(this.scrollProgress * Math.PI * 3) * 20 * this.config.parallaxIntensity;
    }

    if (this.octahedron) {
      this.octahedron.position.y += (this.scrollProgress * 100 - this.octahedron.position.y) * 0.1;
      this.octahedron.rotation.x += 0.003;
      this.octahedron.rotation.y += 0.005;
    }

    if (this.cube) {
      this.cube.position.y = -50 + this.scrollProgress * 100;
      this.cube.rotation.x += 0.002;
      this.cube.rotation.z += 0.004;
    }
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Handle visibility changes (pause/resume animation)
   */
  onVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Main animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update particles
    this.updateParticles();

    // Rotate geometries
    if (this.torus) {
      this.torus.rotation.x += 0.001;
      this.torus.rotation.y += 0.002;
    }

    if (this.particleSystem) {
      this.particleSystem.rotation.x += 0.0001;
      this.particleSystem.rotation.y += 0.0002;
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update particle positions with floating motion
   */
  updateParticles() {
    if (!this.particleSystem) return;

    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocity = this.particleVelocities;

    for (let i = 0; i < positions.length; i += 3) {
      // Apply velocity
      positions[i] += velocity[i];
      positions[i + 1] += velocity[i + 1];
      positions[i + 2] += velocity[i + 2];

      // Bounce at boundaries
      if (Math.abs(positions[i]) > 100) velocity[i] *= -1;
      if (Math.abs(positions[i + 1]) > 100) velocity[i + 1] *= -1;
      if (Math.abs(positions[i + 2]) > 100) velocity[i + 2] *= -1;

      // Add slight gravity
      velocity[i + 1] -= 0.0001;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Handle WebGL fallback
   */
  handleWebGLFallback() {
    console.warn('WebGL not supported. Displaying fallback content.');
    const container = document.getElementById('three-container') || document.body;
    const fallback = document.createElement('div');
    fallback.style.cssText = `
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #0a0e27 0%, #1a3a3a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4ecca3;
      font-size: 24px;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    fallback.innerHTML = '<div><p>3D rendering not available in your browser</p><p style="font-size: 16px; margin-top: 20px;">Please use a modern browser for the full experience</p></div>';
    container.appendChild(fallback);
  }

  /**
   * Pause animation
   */
  pause() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  /**
   * Resume animation
   */
  resume() {
    if (this.initialized) {
      this.animate();
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.pause();
    
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  }
}

/**
 * Enhanced Scroll Transition Manager
 */
class ScrollTransitionManager {
  constructor() {
    this.elements = [];
    this.observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    this.init();
  }

  init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateElement(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, this.observerOptions);

    // Observe all elements with data-scroll-animate attribute
    document.querySelectorAll('[data-scroll-animate]').forEach(el => {
      this.observer.observe(el);
    });
  }

  animateElement(element) {
    const animationType = element.dataset.scrollAnimate || 'fadeInUp';
    element.classList.add('animate', `animate-${animationType}`);
  }
}

/**
 * Smooth scroll behavior manager
 */
class SmoothScrollManager {
  constructor() {
    if ('scrollBehavior' in document.documentElement.style) {
      document.documentElement.style.scrollBehavior = 'smooth';
    } else {
      this.polyfillSmoothScroll();
    }
  }

  polyfillSmoothScroll() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (!target) return;

      e.preventDefault();
      const id = target.getAttribute('href').slice(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/**
 * Initialize on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize 3D visualization
  window.farmbridgeViz = new FarmbridgeVisualization();

  // Initialize scroll transitions
  window.scrollTransition = new ScrollTransitionManager();

  // Initialize smooth scroll
  window.smoothScroll = new SmoothScrollManager();

  console.log('✓ All systems initialized');
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (window.farmbridgeViz) {
    window.farmbridgeViz.destroy();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FarmbridgeVisualization,
    ScrollTransitionManager,
    SmoothScrollManager
  };
}
