/* TikTok Pixel Code Start */
(function (w, d, t) {
  if (w.self !== w.top || w.__tiktokPixelLoaded) return;
  w.__tiktokPixelLoaded = true;

  // Add further pixels here — ttq is multi-pixel, and the ttq.page() below covers every entry.
  var PIXEL_IDS = ["DB8462BC77U5AOV8DVGG", "DBMLAHRC77U4J2JR0GQ0", "D9K1G33C77U820ARO52G"];

  w.TiktokAnalyticsObject = t;
  var ttq = (w[t] = w[t] || []);
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = function (target, method) {
    target[method] = function () {
      target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  for (var i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }
  ttq.instance = function (pixelId) {
    var instance = ttq._i[pixelId] || [];
    for (var index = 0; index < ttq.methods.length; index++) {
      ttq.setAndDefer(instance, ttq.methods[index]);
    }
    return instance;
  };
  ttq.load = function (pixelId, options) {
    var eventsUrl = "https://analytics.tiktok.com/i18n/pixel/events.js";
    var script;
    var firstScript;
    ttq._i = ttq._i || {};
    if (ttq._i[pixelId]) return;
    ttq._i[pixelId] = [];
    ttq._i[pixelId]._u = eventsUrl;
    ttq._t = ttq._t || {};
    ttq._t[pixelId] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[pixelId] = options || {};
    script = d.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = eventsUrl + "?sdkid=" + pixelId + "&lib=" + t;
    firstScript = d.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  };

  for (var p = 0; p < PIXEL_IDS.length; p++) {
    ttq.load(PIXEL_IDS[p]);
  }

  // /up1 immediately redirects to its standalone document, which fires the real PageView.
  if (w.location.pathname !== "/up1") ttq.page();
})(window, document, "ttq");
/* TikTok Pixel Code End */
