// ...existing code...
var radius = 240;
var autoRotate = true;
var rotateSpeed = -60;
var imgWidth = 120;
var imgHeight = 170;

// START
setTimeout(init, 1000);

var odrag = document.getElementById("drag-container");
var ospin = document.getElementById("spin-container");
var aImg = ospin.getElementsByTagName("img");
var aVid = ospin.getElementsByTagName("video");
var aEle = [...aImg, ...aVid];

ospin.style.width = imgWidth + "px";
ospin.style.height = imgHeight + "px";

var ground = document.getElementById("ground");
ground.style.width = radius * 3 + "px";
ground.style.height = radius * 3 + "px";

var tX = 0;
var tY = 10;

var selectedIndex = null; // index of the image currently zoomed
var dimOpacity = 0.1;

// Audio Control: try autoplay, else start on first user gesture (tap/click)
var bgMusic = document.getElementById("bg-music");
var isAudioPlaying = false;

// Chỉ play audio khi người dùng tương tác lần đầu
function startAudioOnGesture() {
  // remove listeners (keeps behavior once)
  document.removeEventListener("pointerdown", startAudioOnGesture);
  document.removeEventListener("pointerup", startAudioOnGesture);
  document.removeEventListener("touchstart", startAudioOnGesture);
  document.removeEventListener("touchend", startAudioOnGesture);
  document.removeEventListener("click", startAudioOnGesture);

  console.log("user gesture detected: trying to play bgMusic");

  // Ensure AudioContext is created/resumed inside user gesture
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && !window._carouselAudioCtx) {
      window._carouselAudioCtx = new AudioCtx();
      // resume() may reject if not allowed; ignore error but try to resume
      window._carouselAudioCtx.resume().catch((e) => {
        console.warn("audioCtx.resume() rejected:", e);
      });
      try {
        // connect media element to context to help unlock on some platforms
        const srcNode =
          window._carouselAudioCtx.createMediaElementSource(bgMusic);
        srcNode.connect(window._carouselAudioCtx.destination);
      } catch (e) {
        // createMediaElementSource may throw if the element is already used; ignore
      }
    }
  } catch (e) {
    console.warn("AudioContext create/resume error:", e);
  }

  bgMusic
    .play()
    .then(() => {
      isAudioPlaying = true;
      console.log("bgMusic.play() succeeded");
    })
    .catch(async (err) => {
      console.warn("bgMusic.play() failed, fallback attempts", err);
      // try to resume existing audio context if available
      try {
        if (
          window._carouselAudioCtx &&
          window._carouselAudioCtx.state === "suspended"
        ) {
          await window._carouselAudioCtx.resume();
        }
      } catch (e) {
        console.warn("resume fallback failed", e);
      }

      // try play again
      try {
        await bgMusic.play();
        isAudioPlaying = true;
        console.log("Played after resume fallback");
        return;
      } catch (e) {
        console.warn("second play() attempt failed", e);
      }

      // last resort: muted-then-unmute trick
      try {
        bgMusic.muted = true;
        await bgMusic.play();
        bgMusic.muted = false;
        isAudioPlaying = true;
        console.log("Played via muted-then-unmute trick");
      } catch (e) {
        console.error("All autoplay attempts failed", e);
      }
    });
}
// Lắng nghe 1 lần trên cả down và up/end (một số thiết bị cho phép action trên 'end')
document.addEventListener("pointerdown", startAudioOnGesture, { once: true });
document.addEventListener("pointerup", startAudioOnGesture, { once: true });
document.addEventListener("touchstart", startAudioOnGesture, { once: true });
document.addEventListener("touchend", startAudioOnGesture, { once: true });
document.addEventListener("click", startAudioOnGesture, { once: true });

// Lazy Load Images
function lazyLoadImages() {
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          observer.unobserve(img);
        }
      });
    });

    // ensure we iterate an Array (HTMLCollection may not have forEach)
    Array.from(aImg).forEach((img) => imageObserver.observe(img));
  }
}

// Arrange carousel so that item at `centerIndex` is at front (angle 0)
function arrangeCarouselCenter(centerIndex, delayTime) {
  var len = aEle.length;
  var step = 360 / len;
  for (var i = 0; i < len; i++) {
    var angle = (i - centerIndex) * step;
    aEle[i].style.transition = "transform 0.8s, opacity 0.4s";
    aEle[i].style.transitionDelay = delayTime || (len - i) / 8 + "s";
    aEle[i].style.transform =
      "rotateY(" + angle + "deg) translateZ(" + radius + "px)";
    aEle[i].style.opacity = ""; // restore opacity if it was changed
    aEle[i].style.pointerEvents = ""; // restore pointer events
  }
}

// Helper: restore all elements after zoom close
function closeZoom(recenter) {
  // restore active element(s) transforms / states
  aEle.forEach(function (el) {
    el.classList.remove("active");
    if (el.dataset.origTransform !== undefined) {
      el.style.transform = el.dataset.origTransform;
      delete el.dataset.origTransform;
    } else {
      // if no saved transform, compute based on current selectedIndex after re-arrange
      el.style.transform = el.style.transform || "";
    }
    el.style.transition = "transform 0.8s, opacity 0.4s";
    el.style.opacity = "";
    el.style.pointerEvents = "";
  });

  odrag.style.pointerEvents = "";
  playSpin(true);

  if (recenter && selectedIndex !== null) {
    // re-arrange carousel with the previously selected index at center
    arrangeCarouselCenter(selectedIndex, 0.2);
  }

  selectedIndex = null;
}

// Helper: restore single element (kept for compatibility)
function restoreElement(el) {
  // Not used to recenter: call closeZoom(true) instead
  el.classList.remove("active");
  if (el.dataset.origTransform !== undefined) {
    el.style.transform = el.dataset.origTransform;
    delete el.dataset.origTransform;
  } else {
    el.style.transform = "";
  }
}

// Click để zoom effect (không fullscreen)
// - lưu transform gốc, override transform để căn giữa, pause carousel và disable dragging
aEle.forEach((element, idx) => {
  element.addEventListener("click", function (e) {
    e.stopPropagation();

    // Nếu đã active -> đóng (và re-center vào ảnh đó)
    if (this.classList.contains("active")) {
      closeZoom(true);
      return;
    }

    // Nếu có ảnh khác đang open thì đóng trước
    if (selectedIndex !== null) closeZoom(false);

    // Save index of clicked item so we can re-center later
    selectedIndex = idx;

    // Lưu transform gốc (được thiết lập bởi arrange/init)
    this.dataset.origTransform = this.style.transform || "";

    // Thêm class active và override transform inline để căn giữa (CSS .active sẽ set position fixed)
    this.classList.add("active");
    // Đặt inline transform giống CSS để chắc chắn override transform cũ
    // (CSS .active sets top/left; ensure transform centers the fixed item)
    this.style.transform = "translate(-50%, -50%)";
    this.style.transition = "transform 0.4s";

    // Dim / disable other elements while zoomed
    aEle.forEach(function (el) {
      if (el !== element) {
        el.style.opacity = dimOpacity;
        el.style.pointerEvents = "none";
      }
    });

    // Tạm dừng quay và vô hiệu hóa kéo của carousel
    playSpin(false);
    odrag.style.pointerEvents = "none";
  });
});

// Click ra ngoài để thu nhỏ ảnh/video (re-center vào ảnh đã chọn)
document.addEventListener("click", () => {
  closeZoom(true);
});

function init(delayTime) {
  // initial circular arrangement (center index 0)
  for (var i = 0; i < aEle.length; i++) {
    aEle[i].style.transform =
      "rotateY(" +
      i * (360 / aEle.length) +
      "deg) translateZ(" +
      radius +
      "px)";
    aEle[i].style.transition = "transform 1s";
    aEle[i].style.transitionDelay = delayTime || (aEle.length - i) / 4 + "s";
    aEle[i].style.opacity = ""; // ensure visible
    aEle[i].style.pointerEvents = ""; // ensure clickable
  }
}

function applyTransform(obj) {
  if (tY > 180) tY = 180;
  if (tY < 0) tY = 0;

  obj.style.transform = "rotateX(" + -tY + "deg) rotateY(" + tX + "deg)";
}

function playSpin(yes) {
  ospin.style.animationPlayState = yes ? "running" : "paused";
}

if (autoRotate) {
  var animationName = rotateSpeed > 0 ? "spin" : "spinRevert";
  ospin.style.animation = `${animationName} ${Math.abs(
    rotateSpeed
  )}s infinite linear`;
}

document.onpointerdown = function (e) {
  clearInterval(odrag.timer);
  e = e || window.event;
  var sX = e.clientX;
  var sY = e.clientY;
  this.onpointermove = function (e) {
    e = e || window.event;
    var nX = e.clientX;
    var nY = e.clientY;
    var desX = nX - sX;
    var desY = nY - sY;
    tX += desX * 0.1;
    tY += desY * 0.1;
    applyTransform(odrag);
    sX = nX;
    sY = nY;
  };
  this.onpointerup = function (e) {
    odrag.timer = setInterval(function () {
      var desX = 0;
      var desY = 0;
      desX *= 0.95;
      desY *= 0.95;
      tX += desX * 0.1;
      tY += desY * 0.1;
      applyTransform(odrag);
      playSpin(false);
      if (Math.abs(desX) < 0.5 && Math.abs(desY) < 0.5) {
        clearInterval(odrag.timer);
        playSpin(true);
      }
    }, 17);
    this.onpointermove = this.onpointerup = null;
  };

  return false;
};

document.onwheel = function (e) {
  e = e || window.event;
  var d = e.deltaY / 20 || -e.detail / 2;
  radius += d;
  // re-arrange with same center (if selectedIndex set use it, else 0)
  if (selectedIndex !== null) arrangeCarouselCenter(selectedIndex, 0.1);
  else init(1);
};

// Initialize lazy loading
lazyLoadImages();
// ...existing code...
