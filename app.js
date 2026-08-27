import { initializeAnalytics, track } from "./analytics.js";
import { portfolioConfig } from "./portfolio.config.js";

const root = document.documentElement;
const header = document.querySelector("[data-header]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

initializeAnalytics();

const aboutStory = document.querySelector("[data-about-story]");
const aboutTabs = [...document.querySelectorAll("[data-about-mode]")];
const aboutProfessionalPanel = document.querySelector("#about-professional");
const aboutPersonalPanel = document.querySelector("#about-personal");

function setAboutMode(mode, shouldFocus = false) {
  if (!aboutStory || !["professional", "personal"].includes(mode)) return;

  aboutStory.dataset.mode = mode;
  aboutTabs.forEach((tab) => {
    const isActive = tab.dataset.aboutMode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
    if (isActive && shouldFocus) tab.focus();
  });

  aboutProfessionalPanel?.setAttribute("aria-hidden", String(mode !== "professional"));
  aboutPersonalPanel?.setAttribute("aria-hidden", String(mode !== "personal"));
}

aboutTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setAboutMode(tab.dataset.aboutMode));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + aboutTabs.length) % aboutTabs.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % aboutTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = aboutTabs.length - 1;
    setAboutMode(aboutTabs[nextIndex].dataset.aboutMode, true);
  });
});

if (aboutStory) setAboutMode(aboutStory.dataset.mode);

const workCarousel = document.querySelector("[data-work-carousel]");
const workTrack = document.querySelector("[data-work-track]");
const workSlides = workTrack ? [...workTrack.querySelectorAll(".project-card")] : [];
const workDots = [...document.querySelectorAll("[data-work-dot]")];
const workCount = document.querySelector("[data-work-count]");
let activeWorkSlide = 0;
let workSwipeStartX = null;

function setWorkSlide(nextIndex, source = "control") {
  if (!workTrack || !workSlides.length) return;

  activeWorkSlide = (nextIndex + workSlides.length) % workSlides.length;
  workCarousel?.classList.toggle("is-first-slide", activeWorkSlide === 0);
  workCarousel?.classList.toggle("is-third-slide", activeWorkSlide === 2);
  workTrack.style.transform = `translateX(-${activeWorkSlide * 100}%)`;

  workSlides.forEach((slide, index) => {
    const isActive = index === activeWorkSlide;
    slide.classList.toggle("is-carousel-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
    slide.querySelectorAll("a, button").forEach((element) => {
      if (isActive) element.removeAttribute("tabindex");
      else element.tabIndex = -1;
    });
  });

  workDots.forEach((dot, index) => {
    const isActive = index === activeWorkSlide;
    dot.classList.toggle("is-active", isActive);
    if (isActive) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });

  if (workCount) {
    workCount.textContent = `${String(activeWorkSlide + 1).padStart(2, "0")} / ${String(workSlides.length).padStart(2, "0")}`;
  }

  document.dispatchEvent(new CustomEvent("workslidechange", { detail: { index: activeWorkSlide } }));

  if (source !== "initial") track("work_carousel_changed", { project: activeWorkSlide + 1, source });
}

document.querySelector("[data-work-prev]")?.addEventListener("click", () => setWorkSlide(activeWorkSlide - 1));
document.querySelector("[data-work-next]")?.addEventListener("click", () => setWorkSlide(activeWorkSlide + 1));
workDots.forEach((dot) => dot.addEventListener("click", () => setWorkSlide(Number(dot.dataset.workDot), "dot")));

workCarousel?.addEventListener("keydown", (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  setWorkSlide(activeWorkSlide + (event.key === 'ArrowRight' ? 1 : -1), "keyboard");
});

workCarousel?.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") workSwipeStartX = event.clientX;
});

workCarousel?.addEventListener("pointerup", (event) => {
  if (workSwipeStartX === null || event.pointerType !== "touch") return;
  const swipeDistance = event.clientX - workSwipeStartX;
  workSwipeStartX = null;
  if (Math.abs(swipeDistance) < 50) return;
  setWorkSlide(activeWorkSlide + (swipeDistance < 0 ? 1 : -1), "swipe");
});

setWorkSlide(0, "initial");

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const profileLinks = {
  github: portfolioConfig.owner.githubUrl,
  linkedin: portfolioConfig.owner.linkedinUrl,
  email: `mailto:${portfolioConfig.owner.email}`,
};

document.querySelectorAll("[data-profile-link]").forEach((link) => {
  link.href = profileLinks[link.dataset.profileLink];
});

window.addEventListener(
  "scroll",
  () => header.classList.toggle("is-scrolled", window.scrollY > 30),
  { passive: true },
);

document.querySelectorAll("[data-track]").forEach((element) => {
  element.addEventListener("click", () => {
    track("portfolio_link_clicked", {
      link: element.dataset.track,
      destination: element.getAttribute("href") || "button",
    });
  });
});

const dnaNodes = [...document.querySelectorAll(".dna-node")];
const dnaCanvas = document.querySelector("[data-dna-canvas]");

function drawDnaIllustration() {
  if (!dnaCanvas || dnaNodes.length < 2) return;

  const bounds = {
    width: dnaCanvas.clientWidth,
    height: dnaCanvas.clientHeight,
  };
  if (!bounds.width || !bounds.height) return;

  const nodeProgresses = [0.04, 0.11, 0.18, 0.32, 0.4, 0.48, 0.56, 0.64, 0.84, 0.93];
  const fallbackCenterX = bounds.width / 2;
  const fallbackPadding = 24;
  const fallbackHeight = bounds.height - fallbackPadding * 2;
  const fallbackAmplitude = Math.min(bounds.width * 0.36, 128);
  const fallbackTurns = 1;

  dnaNodes.forEach((node, index) => {
    const progress = nodeProgresses[index] ?? index / (dnaNodes.length - 1);
    const phase = -Math.PI / 2 + progress * fallbackTurns * Math.PI * 2;
    const direction = index % 2 === 0 ? 1 : -1;
    const ribbonX = fallbackCenterX + direction * fallbackAmplitude * Math.sin(phase);
    const outwardDirection = Math.sign(ribbonX - fallbackCenterX) || direction;
    const x = ribbonX + outwardDirection * 11;
    const y = fallbackPadding + progress * fallbackHeight;
    node.style.setProperty("--node-x", `${(x / bounds.width) * 100}%`);
    node.style.setProperty("--node-y", `${(y / bounds.height) * 100}%`);
  });

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  dnaCanvas.width = Math.round(bounds.width * pixelRatio);
  dnaCanvas.height = Math.round(bounds.height * pixelRatio);

  const context = dnaCanvas.getContext("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.lineCap = "round";
  context.lineJoin = "round";

  const theme = getComputedStyle(root);
  const ink = theme.getPropertyValue("--ink").trim();
  const acid = theme.getPropertyValue("--acid").trim();
  const coral = theme.getPropertyValue("--coral").trim();
  const blue = theme.getPropertyValue("--blue").trim();
  const rungColors = [blue, coral, "#62d99b", "#d979e8", acid];
  const centerX = bounds.width / 2;
  const verticalPadding = 24;
  const usableHeight = bounds.height - verticalPadding * 2;
  const amplitude = Math.min(bounds.width * 0.36, 128);
  const turns = 1;

  function pointAt(strand, y) {
    const progress = (y - verticalPadding) / usableHeight;
    const phase = -Math.PI / 2 + progress * turns * Math.PI * 2;
    const direction = strand === 0 ? 1 : -1;
    return {
      x: centerX + direction * amplitude * Math.sin(phase),
      y,
    };
  }

  function strokeStrand(strand, startY, endY, width, color) {
    const steps = Math.max(12, Math.ceil((endY - startY) / 4));
    context.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const y = startY + ((endY - startY) * step) / steps;
      const point = pointAt(strand, y);
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }

  const startY = verticalPadding;
  const endY = bounds.height - verticalPadding;

  [0, 1].forEach((strand) => strokeStrand(strand, startY, endY, 30, ink));
  [0, 1].forEach((strand) => strokeStrand(strand, startY, endY, 22, "#d7aa50"));

  dnaNodes.forEach((node, index) => {
    const progress = nodeProgresses[index] ?? index / (dnaNodes.length - 1);
    const y = startY + progress * usableHeight;
    const first = pointAt(0, y);
    const second = pointAt(1, y);

    context.beginPath();
    context.moveTo(first.x, y);
    context.lineTo(second.x, y);
    context.strokeStyle = ink;
    context.lineWidth = 13;
    context.stroke();
    context.strokeStyle = rungColors[index % rungColors.length];
    context.lineWidth = 8;
    context.stroke();

    const nodePoint = pointAt(index % 2, y);
    const outwardDirection = Math.sign(nodePoint.x - centerX) || (index % 2 === 0 ? 1 : -1);
    const nodeX = Math.max(24, Math.min(bounds.width - 24, nodePoint.x + outwardDirection * 11));
    node.style.setProperty("--node-x", `${(nodeX / bounds.width) * 100}%`);
    node.style.setProperty("--node-y", `${(y / bounds.height) * 100}%`);
  });

  const halfTurns = Math.ceil(turns * 2);
  for (let segment = 0; segment < halfTurns; segment += 1) {
    const segmentStart = startY + (segment / halfTurns) * usableHeight;
    const segmentEnd = startY + ((segment + 1) / halfTurns) * usableHeight;
    const frontStrand = segment % 2;
    strokeStrand(frontStrand, segmentStart, segmentEnd, 30, ink);
    strokeStrand(frontStrand, segmentStart, segmentEnd, 22, acid);
  }
}

function activateDnaNode(node) {
  if (!node) return;

  dnaNodes.forEach((candidate) => {
    const isActive = candidate === node;
    candidate.classList.toggle("is-active", isActive);
    candidate.setAttribute("aria-pressed", String(isActive));
  });
}

dnaNodes.forEach((node) => {
  node.addEventListener("mouseenter", () => activateDnaNode(node));
  node.addEventListener("focus", () => activateDnaNode(node));
  node.addEventListener("click", () => {
    activateDnaNode(node);
    track("tech_dna_selected", { technology: node.dataset.tech });
  });
});

if (dnaCanvas) {
  let dnaFrame;
  const scheduleDnaDraw = () => {
    window.cancelAnimationFrame(dnaFrame);
    dnaFrame = window.requestAnimationFrame(drawDnaIllustration);
  };

  drawDnaIllustration();
  window.addEventListener("resize", scheduleDnaDraw, { passive: true });
}

const supportCard = document.querySelector(".project-card:nth-child(3)");
const supportTools = supportCard ? [...supportCard.querySelectorAll(".support-tool")] : [];
const SUPPORT_CYCLE_DURATION = 6000;
let supportCycleTimer;
let supportCycleRunning = false;
let previousWinningTool;

function assignSupportToolRoles() {
  if (supportTools.length < 3) return;

  supportTools.forEach((tool) => tool.classList.remove("is-scan-one", "is-scan-two", "is-winner"));
  void supportCard.offsetWidth;

  const winnerPool = supportTools.filter((tool) => tool !== previousWinningTool);
  const winner = winnerPool[Math.floor(Math.random() * winnerPool.length)];
  const remainingTools = supportTools
    .filter((tool) => tool !== winner)
    .sort(() => Math.random() - 0.5);

  remainingTools[0].classList.add("is-scan-one");
  remainingTools[1].classList.add("is-scan-two");
  winner.classList.add("is-winner");
  previousWinningTool = winner;
}

function startSupportCycle() {
  if (prefersReducedMotion || supportCycleRunning || supportTools.length < 3) return;
  supportCycleRunning = true;
  assignSupportToolRoles();
  supportCycleTimer = window.setInterval(assignSupportToolRoles, SUPPORT_CYCLE_DURATION);
}

function stopSupportCycleIfInactive() {
  window.setTimeout(() => {
    if (supportCard.classList.contains("is-carousel-active") || supportCard.matches(":hover") || supportCard.contains(document.activeElement)) return;
    window.clearInterval(supportCycleTimer);
    supportCycleRunning = false;
  }, 0);
}

function stopSupportCycle() {
  window.clearInterval(supportCycleTimer);
  supportCycleRunning = false;
}

if (supportCard) {
  supportCard.addEventListener("mouseenter", startSupportCycle);
  supportCard.addEventListener("mouseleave", stopSupportCycleIfInactive);
  supportCard.addEventListener("focusin", startSupportCycle);
  supportCard.addEventListener("focusout", stopSupportCycleIfInactive);
}

document.addEventListener("workslidechange", (event) => {
  if (event.detail?.index === 2) startSupportCycle();
  else stopSupportCycle();
});

const revealElements = document.querySelectorAll(".reveal");

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -7%" },
  );

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    revealObserver.observe(element);
  });
}

const sections = [...document.querySelectorAll("main section[id]")];
const navigationLinks = [...document.querySelectorAll('.site-header a[href^="#"]')];
let navigationFrame;

function updateActiveNavigation() {
  navigationFrame = undefined;
  if (!sections.length || !navigationLinks.length) return;

  const marker = window.scrollY + header.offsetHeight + Math.min(window.innerHeight * 0.24, 190);
  let activeSection = sections[0];

  sections.forEach((section) => {
    if (section.offsetTop <= marker) activeSection = section;
  });

  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
    activeSection = sections[sections.length - 1];
  }

  navigationLinks.forEach((link) => {
    const isCurrent = link.getAttribute("href") === `#${activeSection.id}`;
    if (isCurrent) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

function scheduleNavigationUpdate() {
  if (navigationFrame) return;
  navigationFrame = window.requestAnimationFrame(updateActiveNavigation);
}

window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate, { passive: true });
window.addEventListener("hashchange", scheduleNavigationUpdate);
updateActiveNavigation();
