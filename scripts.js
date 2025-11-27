class Carousel {
  constructor(options = {}) {
    this.radius = options.radius || 240;
    this.autoRotate = options.autoRotate !== false;
    this.rotateSpeed = options.rotateSpeed || -60;
    this.imgWidth = options.imgWidth || 120;
    this.imgHeight = options.imgHeight || 170;
    this.dimOpacity = options.dimOpacity || 0.01;

    this.tX = 0;
    this.tY = 10;
    this.selectedIndex = null;
    this.audioStarted = false;

    this.init();
  }

  init() {
    this.setupElements();
    this.setupStyles();
    this.setupAudio();
    this.setupEventListeners();
    this.setupCarousel();
    this.lazyLoadImages();
  }

  setupElements() {
    this.odrag = document.getElementById("drag-container");
    this.ospin = document.getElementById("spin-container");
    this.aImg = this.ospin.getElementsByTagName("img");
    this.aVid = this.ospin.getElementsByTagName("video");
    this.aEle = [...this.aImg, ...this.aVid];
    this.ground = document.getElementById("ground");
    this.bgMusic = document.getElementById("bg-music");
  }

  setupStyles() {
    this.ospin.style.width = this.imgWidth + "px";
    this.ospin.style.height = this.imgHeight + "px";
    this.ground.style.width = this.radius * 3 + "px";
    this.ground.style.height = this.radius * 3 + "px";

    // Responsive adjustments
    if (window.innerWidth < 768) {
      // Mobile breakpoint
      this.ospin.style.width = this.imgWidth * 0.8 + "px"; // Reduce width
      this.ospin.style.height = this.imgHeight * 0.8 + "px"; // Reduce height
      this.radius *= 0.8; // Adjust radius for mobile
    }
  }

  setupAudio() {
    const startAudio = () => {
      if (this.audioStarted) return;
      this.audioStarted = true;
      this.bgMusic.play().catch(() => {
        console.warn("Autoplay blocked, retry on user click.");
      });
    };

    window.addEventListener("pointerdown", startAudio, { once: true });
    window.addEventListener("touchstart", startAudio, { once: true });
    window.addEventListener("click", startAudio, { once: true });
  }

  setupEventListeners() {
    this.aEle.forEach((element, idx) => {
      element.addEventListener("click", (e) =>
        this.handleElementClick(e, element, idx)
      );
    });

    document.addEventListener("click", () => this.closeZoom(true));
    document.onpointerdown = (e) => this.handlePointerDown(e);
    document.onwheel = (e) => this.handleWheel(e);

    // Touch event listeners
    document.addEventListener("touchstart", (e) => this.handleTouchStart(e));
    document.addEventListener("touchmove", (e) => this.handleTouchMove(e));
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
  }

  handleTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    // Implement swipe logic
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.tX += deltaX * 0.1; // Adjust rotation based on swipe
      this.applyTransform();
    }
  }

  handleElementClick(e, element, idx) {
    if (this.audioStarted) e.stopPropagation();

    if (element.classList.contains("active")) {
      this.closeZoom(true);
      return;
    }

    if (this.selectedIndex !== null) this.closeZoom(false);

    this.selectedIndex = idx;
    element.dataset.origTransform = element.style.transform || "";
    element.classList.add("active");
    element.style.transform = "translate(-50%, -50%) scale(1.2)";
    element.style.transition = "transform 0.4s";

    this.aEle.forEach((el) => {
      if (el !== element) {
        el.style.opacity = this.dimOpacity;
        el.style.pointerEvents = "none";
      }
    });

    this.playSpin(false);
    this.odrag.style.pointerEvents = "none";
  }

  closeZoom(recenter) {
    this.aEle.forEach((el) => {
      el.classList.remove("active");
      if (el.dataset.origTransform !== undefined) {
        el.style.transform = el.dataset.origTransform;
        delete el.dataset.origTransform;
      }
      el.style.transition = "transform 0.8s, opacity 0.4s";
      el.style.opacity = "";
      el.style.pointerEvents = "";
    });

    this.odrag.style.pointerEvents = "";
    this.playSpin(true);

    if (recenter && this.selectedIndex !== null) {
      this.arrangeCarouselCenter(this.selectedIndex, 0.2);
    }

    this.selectedIndex = null;
  }

  arrangeCarouselCenter(centerIndex, delayTime) {
    const len = this.aEle.length;
    const step = 360 / len;
    for (let i = 0; i < len; i++) {
      const angle = (i - centerIndex) * step;
      this.aEle[i].style.transition = "transform 0.8s, opacity 0.4s";
      this.aEle[i].style.transitionDelay = delayTime || (len - i) / 8 + "s";
      this.aEle[
        i
      ].style.transform = `rotateY(${angle}deg) translateZ(${this.radius}px)`;
      this.aEle[i].style.opacity = "";
      this.aEle[i].style.pointerEvents = "";
    }
  }

  arrangeCarouselInit(delayTime) {
    for (let i = 0; i < this.aEle.length; i++) {
      this.aEle[i].style.transform = `rotateY(${
        i * (360 / this.aEle.length)
      }deg) translateZ(${this.radius}px)`;
      this.aEle[i].style.transition = "transform 1s";
      this.aEle[i].style.transitionDelay =
        delayTime || (this.aEle.length - i) / 4 + "s";
      this.aEle[i].style.opacity = "";
      this.aEle[i].style.pointerEvents = "";
    }
  }

  applyTransform() {
    if (this.tY > 180) this.tY = 180;
    if (this.tY < 0) this.tY = 0;
    this.odrag.style.transform = `rotateX(${-this.tY}deg) rotateY(${
      this.tX
    }deg)`;
  }

  playSpin(yes) {
    this.ospin.style.animationPlayState = yes ? "running" : "paused";
  }

  handlePointerDown(e) {
    clearInterval(this.odrag.timer);
    const sX = e.clientX;
    const sY = e.clientY;
    let currentSX = sX;
    let currentSY = sY;

    document.onpointermove = (moveE) => {
      const nX = moveE.clientX;
      const nY = moveE.clientY;
      const desX = nX - currentSX;
      const desY = nY - currentSY;
      this.tX += desX * 0.1;
      this.tY += desY * 0.1;
      this.applyTransform();
      currentSX = nX;
      currentSY = nY;
    };

    document.onpointerup = () => {
      this.odrag.timer = setInterval(() => {
        let desX = 0;
        let desY = 0;
        desX *= 0.95;
        desY *= 0.95;
        this.tX += desX * 0.1;
        this.tY += desY * 0.1;
        this.applyTransform();
        this.playSpin(false);
        if (Math.abs(desX) < 0.5 && Math.abs(desY) < 0.5) {
          clearInterval(this.odrag.timer);
          this.playSpin(true);
        }
      }, 17);
      document.onpointermove = null;
      document.onpointerup = null;
    };

    return false;
  }

  handleWheel(e) {
    const d = e.deltaY / 20 || -e.detail / 2;
    this.radius += d;
    if (this.selectedIndex !== null)
      this.arrangeCarouselCenter(this.selectedIndex, 0.1);
    else this.arrangeCarouselInit(1);
  }

  setupCarousel() {
    if (this.autoRotate) {
      const animationName = this.rotateSpeed > 0 ? "spin" : "spinRevert";
      this.ospin.style.animation = `${animationName} ${Math.abs(
        this.rotateSpeed
      )}s infinite linear`;
    }

    setTimeout(() => this.arrangeCarouselInit(), 1000);
  }

  lazyLoadImages() {
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
            }
            imageObserver.unobserve(img);
          }
        });
      });

      Array.from(this.aImg).forEach((img) => imageObserver.observe(img));
    }
  }
}

// Khởi tạo
const carousel = new Carousel({
  radius: 240,
  autoRotate: true,
  rotateSpeed: -60,
  imgWidth: 120,
  imgHeight: 170,
});
