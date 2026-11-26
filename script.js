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
