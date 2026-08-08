// wires up the [light]/[dark] toggle; the pinned theme itself is applied
// by a tiny inline snippet in each page's <head>, before first paint.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  var osDark = window.matchMedia("(prefers-color-scheme: dark)");

  function current() {
    return root.dataset.theme || (osDark.matches ? "dark" : "light");
  }

  // a switch reports the state it is *in*, not the one it moves to
  function sync() {
    btn.setAttribute("aria-checked", current() === "dark" ? "true" : "false");
  }

  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    sync();
  });

  // keep the label honest if the OS flips while no theme is pinned
  osDark.addEventListener("change", sync);
  sync();
})();
