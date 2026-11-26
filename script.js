const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const hashSections = [
  { element: document.querySelector("#home"), hash: "#home" },
  { element: document.querySelector("#games"), hash: "#games" },
  { element: document.querySelector("#current-games"), hash: "#games" },
  { element: document.querySelector("#what-i-do"), hash: "#what-i-do" },
  { element: document.querySelector("#approach"), hash: "#approach" },
  { element: document.querySelector("#contact"), hash: "#contact" },
].filter((section) => section.element);

let hashUpdateQueued = false;
let anchorNavigationPending = false;
let anchorNavigationTimeout = 0;
const finishAnchorNavigation = () => {
  anchorNavigationPending = false;
  window.clearTimeout(anchorNavigationTimeout);
};

document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element
    ? event.target.closest('a[href^="#"]')
    : null;
  if (!anchor) {
    return;
  }

  anchorNavigationPending = true;
  window.clearTimeout(anchorNavigationTimeout);
  anchorNavigationTimeout = window.setTimeout(finishAnchorNavigation, 1500);
});

window.addEventListener("scrollend", finishAnchorNavigation);
window.addEventListener("wheel", finishAnchorNavigation, { passive: true });
window.addEventListener("touchmove", finishAnchorNavigation, { passive: true });

const updateHashFromScroll = () => {
  hashUpdateQueued = false;
  if (anchorNavigationPending) {
    return;
  }

  const markerPosition = window.scrollY + Math.min(window.innerHeight * 0.18, 140);
  let activeHash = "#home";

  hashSections.forEach((section) => {
    const sectionTop = section.element.getBoundingClientRect().top + window.scrollY;
    if (sectionTop <= markerPosition) {
      activeHash = section.hash;
    }
  });

  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    activeHash = "#contact";
  }
  if (window.location.hash !== activeHash) {
    history.replaceState(null, "", activeHash);
  }
};

const scheduleHashUpdate = () => {
  if (!hashUpdateQueued && !anchorNavigationPending) {
    hashUpdateQueued = true;
    window.requestAnimationFrame(updateHashFromScroll);
  }
};

window.addEventListener("scroll", scheduleHashUpdate, { passive: true });
window.addEventListener("resize", scheduleHashUpdate);
window.addEventListener("load", scheduleHashUpdate, { once: true });

const visitCountElement = document.querySelector("#total-game-visits");
const visitStatusElement = document.querySelector("#total-game-visits-status");
const trackedUniverseIds = [
  "7660436108", // Anime Crusaders X
  "10768944292", // Prehistoric Farm
  "8946565814", // Anime Origins
];

if (visitCountElement && visitStatusElement) {
  let hasSuccessfulVisitUpdate = false;

  const updateTotalGameVisits = async () => {
    try {
      const response = await fetch(
        `https://games.roproxy.com/v1/games?universeIds=${trackedUniverseIds.join(",")}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Roblox returned HTTP ${response.status}.`);
      }

      const result = await response.json();
      if (!Array.isArray(result.data)) {
        throw new Error("Roblox returned an invalid game visits response.");
      }

      const gamesByUniverseId = new Map(
        result.data.map((game) => [String(game.id), game]),
      );
      const totalVisits = trackedUniverseIds.reduce((total, universeId) => {
        const game = gamesByUniverseId.get(universeId);
        if (!game || !Number.isSafeInteger(game.visits) || game.visits < 0) {
          throw new Error(`Roblox did not return a valid visits count for universe ${universeId}.`);
        }
        return total + game.visits;
      }, 0);

      visitCountElement.textContent = totalVisits.toLocaleString();
      visitStatusElement.textContent = "";
      visitStatusElement.hidden = true;
      hasSuccessfulVisitUpdate = true;
    } catch (error) {
      console.error("Unable to update live Roblox game visits.", error);
      if (!hasSuccessfulVisitUpdate) {
        visitCountElement.textContent = "—";
      }
      visitStatusElement.textContent = hasSuccessfulVisitUpdate
        ? "Update unavailable; displayed total may be outdated."
        : "Live total unavailable; retrying automatically.";
      visitStatusElement.hidden = false;
    }
  };

  void updateTotalGameVisits();
  window.setInterval(updateTotalGameVisits, 30_000);
}
