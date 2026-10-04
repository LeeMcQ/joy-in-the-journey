/* Android app only: inlined into <head> by the android-app-build plugin (vite.config.ts).
 * Never leave a silent blank screen. index.html's #root starts with a visible
 * "Loading…" placeholder that React replaces when it mounts. If a script fails
 * to load or throws before React mounts, or nothing has mounted after 12 s,
 * show what went wrong and a Retry button. Plain ES5 on purpose: it has to run
 * even on a WebView too old for the app bundle. */
(function () {
  var shown = false;
  function mounted() {
    var r = document.getElementById("root");
    return !!(r && r.firstElementChild && r.firstElementChild.id !== "boot-fallback");
  }
  function show(msg) {
    if (shown || mounted()) return;
    shown = true;
    var box = document.getElementById("boot-fallback");
    if (!box) return;
    box.innerHTML =
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px">Joy in the Journey couldn\u2019t start</div>' +
      '<div style="opacity:.8;margin-bottom:16px">Please tap Retry. If this keeps happening, update \u201cAndroid System WebView\u201d and \u201cChrome\u201d in the Play Store.</div>' +
      '<button id="boot-retry" style="background:#D4A843;color:#0F172A;border:0;border-radius:12px;padding:12px 28px;font-size:16px;font-weight:700">Retry</button>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;opacity:.55;font-size:11px;margin-top:20px;text-align:left">' +
      String(msg).replace(/[<&]/g, function (c) { return c === "<" ? "&lt;" : "&amp;"; }) + "</pre>";
    document.getElementById("boot-retry").onclick = function () { location.replace("/"); };
  }
  window.addEventListener("error", function (e) {
    var t = e && e.target;
    if (t && t !== window && (t.src || t.href)) show("Failed to load " + (t.src || t.href));
    else show((e && e.message) || "Script error");
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    show("Unhandled: " + (e && e.reason && (e.reason.message || e.reason)));
  });
  setTimeout(function () { show("The app did not start within 12 s (" + navigator.userAgent + ")"); }, 12000);
})();
