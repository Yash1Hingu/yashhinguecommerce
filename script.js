const header = document.getElementById("siteHeader");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const currentYear = document.getElementById("currentYear");
const sections = Array.from(document.querySelectorAll("main section[id]"));
const navItems = Array.from(document.querySelectorAll(".nav-links a"));
const sectionLinks = document.querySelectorAll('a[href^="#"]');
const imagesWithFallback = document.querySelectorAll(".profile-image, .cert-image");
const sceneCanvas = document.getElementById("scene3d");
const tiltCards = document.querySelectorAll(".tilt-card");
const revealItems = document.querySelectorAll(".reveal");

const closeMobileMenu = () => {
  document.body.classList.remove("nav-open");
  navLinks.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open menu");
};

const updateHeader = () => {
  header.classList.toggle("scrolled", window.scrollY > 12);
};

const setActiveNavLink = () => {
  let activeId = sections[0]?.id || "home";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 130;
    if (window.scrollY >= sectionTop) {
      activeId = section.id;
    }
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.getAttribute("href") === `#${activeId}`);
  });
};

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

sectionLinks.forEach((item) => {
  item.addEventListener("click", (event) => {
    const href = item.getAttribute("href");

    if (href === "#") {
      event.preventDefault();
      return;
    }

    if (href?.startsWith("#")) {
      closeMobileMenu();
    }
  });
});

imagesWithFallback.forEach((image) => {
  const imageWrapper = image.closest(".profile-card, .cert-card");

  if (image.complete && image.naturalWidth > 0) {
    imageWrapper?.classList.add("has-image");
  }

  image.addEventListener("load", () => {
    imageWrapper?.classList.add("has-image");
  });

  image.addEventListener("error", () => {
    image.classList.add("is-hidden");
  });
});

tiltCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
  });

  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => revealObserver.observe(item));

const create3dScene = () => {
  if (!sceneCanvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = sceneCanvas.getContext("2d");
  const pointer = { x: 0, y: 0 };
  const boxes = [
    { x: -260, y: -120, z: 280, w: 90, h: 90, d: 90, speed: 0.55, color: "rgba(182,255,92," },
    { x: 310, y: -40, z: 120, w: 120, h: 70, d: 120, speed: -0.42, color: "rgba(102,217,255," },
    { x: -170, y: 180, z: -40, w: 140, h: 74, d: 88, speed: -0.36, color: "rgba(242,201,76," },
    { x: 230, y: 210, z: 330, w: 84, h: 84, d: 84, speed: 0.46, color: "rgba(182,255,92," },
    { x: 40, y: -230, z: -120, w: 150, h: 48, d: 150, speed: 0.28, color: "rgba(102,217,255," }
  ];
  const grid = Array.from({ length: 42 }, (_, index) => ({
    x: (index % 7 - 3) * 120,
    y: 270,
    z: Math.floor(index / 7) * 120 - 260
  }));
  let width = 0;
  let height = 0;
  let dpr = 1;
  let time = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    sceneCanvas.width = Math.floor(width * dpr);
    sceneCanvas.height = Math.floor(height * dpr);
    sceneCanvas.style.width = `${width}px`;
    sceneCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rotateY = (point, angle) => ({
    x: point.x * Math.cos(angle) - point.z * Math.sin(angle),
    y: point.y,
    z: point.x * Math.sin(angle) + point.z * Math.cos(angle)
  });

  const rotateX = (point, angle) => ({
    x: point.x,
    y: point.y * Math.cos(angle) - point.z * Math.sin(angle),
    z: point.y * Math.sin(angle) + point.z * Math.cos(angle)
  });

  const project = (point) => {
    const camera = 760;
    const scale = camera / (camera + point.z);

    return {
      x: width * 0.5 + (point.x + pointer.x * 34) * scale,
      y: height * 0.48 + (point.y + pointer.y * 28) * scale,
      scale
    };
  };

  const drawLine = (a, b, color, alpha = 0.42) => {
    ctx.strokeStyle = `${color}${alpha})`;
    ctx.lineWidth = Math.max(0.8, Math.min(2.4, (a.scale + b.scale) * 0.9));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const drawBox = (box) => {
    const hw = box.w / 2;
    const hh = box.h / 2;
    const hd = box.d / 2;
    const angle = time * box.speed;
    const points = [
      { x: -hw, y: -hh, z: -hd }, { x: hw, y: -hh, z: -hd },
      { x: hw, y: hh, z: -hd }, { x: -hw, y: hh, z: -hd },
      { x: -hw, y: -hh, z: hd }, { x: hw, y: -hh, z: hd },
      { x: hw, y: hh, z: hd }, { x: -hw, y: hh, z: hd }
    ].map((point) => {
      const rotated = rotateX(rotateY(point, angle), angle * 0.55);
      return project({
        x: rotated.x + box.x,
        y: rotated.y + box.y + Math.sin(time * 1.4 + box.x) * 10,
        z: rotated.z + box.z
      });
    });
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

    edges.forEach(([a, b]) => drawLine(points[a], points[b], box.color));
  };

  const drawGrid = () => {
    const angle = -0.35 + pointer.x * 0.08;
    const projected = grid.map((point) => project(rotateY(point, angle)));

    projected.forEach((point, index) => {
      if ((index + 1) % 7 !== 0) {
        drawLine(point, projected[index + 1], "rgba(182,255,92,", 0.12);
      }

      if (index + 7 < projected.length) {
        drawLine(point, projected[index + 7], "rgba(102,217,255,", 0.1);
      }
    });
  };

  const animate = () => {
    time += 0.012;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(width * 0.64, height * 0.36, 40, width * 0.64, height * 0.36, Math.max(width, height) * 0.62);
    gradient.addColorStop(0, "rgba(182, 255, 92, 0.12)");
    gradient.addColorStop(0.42, "rgba(102, 217, 255, 0.045)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawGrid();
    boxes.forEach(drawBox);
    requestAnimationFrame(animate);
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / width - 0.5;
    pointer.y = event.clientY / height - 0.5;
  });

  resize();
  animate();
};

create3dScene();

currentYear.textContent = new Date().getFullYear();
updateHeader();
setActiveNavLink();

window.addEventListener("scroll", () => {
  updateHeader();
  setActiveNavLink();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    closeMobileMenu();
  }
});
