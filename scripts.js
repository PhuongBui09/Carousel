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
var tY = 10; // Initial tY value

function init(delayTime) {
  for (var i = 0; i < aEle.length; i++) {
    aEle[i].style.transform =
      "rotateY(" +
      i * (360 / aEle.length) +
      "deg) translateZ(" +
      radius +
      "px)";
    aEle[i].style.transition = "transform 1s";
    aEle[i].style.transitionDelay = delayTime || (aEle.length - i) / 4 + "s";
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
  init(1);
};
