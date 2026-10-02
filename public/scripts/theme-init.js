/**
 * Theme + JS flag bootstrap — classic blocking script in <head>, so it runs
 * before first paint (no FOUC) and satisfies CSP script-src 'self'
 * (replaces the previous inline scripts; behavior is identical).
 */
(function () {
  try {
    var t = localStorage.getItem("m202-theme");
    var d = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (d) document.documentElement.setAttribute("data-theme", "dark");
  } catch (e) {
    /* storage unavailable — default light */
  }
  document.documentElement.classList.add("js");
})();
