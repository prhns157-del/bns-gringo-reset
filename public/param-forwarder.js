(function () {
  if (window.__paramForwarderInstalled) return;
  window.__paramForwarderInstalled = true;

  var CHECKOUT_HOSTS = new Set(["www.checkout-ds24.com", "checkout-ds24.com"]);

  function currentParams() {
    return new URLSearchParams(window.location.search);
  }

  function readCookie(name) {
    try {
      var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : "";
    } catch (error) {
      return "";
    }
  }

  // ttclid only arrives on the first landing URL, so keep it for the rest of the funnel.
  function adClickId() {
    var fromUrl = currentParams().get("ttclid") || "";
    try {
      if (fromUrl) {
        window.sessionStorage.setItem("__ttclid", fromUrl);
        return fromUrl;
      }
      return window.sessionStorage.getItem("__ttclid") || "";
    } catch (error) {
      return fromUrl;
    }
  }

  function isAnswerLink(url) {
    return CHECKOUT_HOSTS.has(url.hostname) && url.pathname.indexOf("/answer/") === 0;
  }

  var UTM_KEYS = ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"];

  // Funnel UTMs also only arrive on the first landing URL; keep them for the checkout link.
  function funnelUtms() {
    var params = currentParams();
    var found = {};
    var any = false;
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) {
        found[key] = value.slice(0, 150);
        any = true;
      }
    });
    try {
      if (any) {
        window.sessionStorage.setItem("__utms", JSON.stringify(found));
        return found;
      }
      return JSON.parse(window.sessionStorage.getItem("__utms") || "{}");
    } catch (error) {
      return found;
    }
  }

  // base64url(JSON): safe to drop into a postback URL without escaping problems.
  function encodeUtms(utms) {
    if (!Object.keys(utms).length) return "";
    var base64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(utms))));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // xTracky V2 LeadId (e.g. "TT-1763007625226-yn4xita3qylwh"). getLeadId() returns null until the
  // script is ready, so keep the last good value for the rest of the funnel.
  function xtrackyLeadId() {
    var current = "";
    try {
      if (window.xtracky && typeof window.xtracky.getLeadId === "function") {
        current = window.xtracky.getLeadId() || "";
      }
    } catch (error) {}
    try {
      if (current) {
        window.sessionStorage.setItem("__xtLead", current);
        return current;
      }
      return window.sessionStorage.getItem("__xtLead") || "";
    } catch (error) {
      return current;
    }
  }

  // Digistore hands sid1..sid5 back in its postback/IPN. The server uses them to attribute the
  // sale: sid1 = ttclid, sid2 = TikTok pixel cookie _ttp, sid3 = funnel UTMs (for Utmify),
  // sid4 = xTracky LeadId (without it xTracky treats the sale as organic).
  function addAdIds(url) {
    var ttclid = adClickId();
    var ttp = readCookie("_ttp");
    var utms = encodeUtms(funnelUtms());
    var leadId = xtrackyLeadId();
    if (ttclid && !url.searchParams.has("sid1")) url.searchParams.set("sid1", ttclid);
    if (ttp && !url.searchParams.has("sid2")) url.searchParams.set("sid2", ttp);
    if (utms && !url.searchParams.has("sid3")) url.searchParams.set("sid3", utms);
    if (leadId && !url.searchParams.has("sid4")) url.searchParams.set("sid4", leadId);
  }

  function appendCurrentParams(rawUrl) {
    if (!rawUrl) return rawUrl;

    try {
      var url = new URL(rawUrl, window.location.href);
      var isCheckout = CHECKOUT_HOSTS.has(url.hostname) && !isAnswerLink(url);
      var params = currentParams();
      if (!params.toString() && !isCheckout) return rawUrl;

      params.forEach(function (value, key) {
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      });
      if (isCheckout) addAdIds(url);
      return url.toString();
    } catch (error) {
      return rawUrl;
    }
  }

  function shouldDecorate(url) {
    // Digistore24 upsell answer links (/answer/yes|no) carry their own order context; leave untouched.
    if (isAnswerLink(url)) return false;
    return url.origin === window.location.origin || CHECKOUT_HOSTS.has(url.hostname);
  }

  function decorateTrackedLinks() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      try {
        var url = new URL(link.href, window.location.href);
        if (shouldDecorate(url)) link.href = appendCurrentParams(link.href);
      } catch (error) {}
    });
  }

  function appendParamsToInternalUrl(rawUrl) {
    var params = currentParams();
    if (!rawUrl || !params.toString()) return rawUrl;

    try {
      var url = new URL(rawUrl, window.location.href);
      if (url.origin !== window.location.origin) return rawUrl;
      params.forEach(function (value, key) {
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      });
      return url.pathname + url.search + url.hash;
    } catch (error) {
      return rawUrl;
    }
  }

  function patchHistoryMethod(methodName) {
    var original = history[methodName];
    history[methodName] = function (state, title, url) {
      if (typeof url === "string") {
        return original.call(this, state, title, appendParamsToInternalUrl(url));
      }
      return original.apply(this, arguments);
    };
  }

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  document.addEventListener(
    "click",
    function (event) {
      var link = event.target && event.target.closest && event.target.closest("a[href]");
      if (!link) return;

      try {
        var url = new URL(link.href, window.location.href);
        if (!shouldDecorate(url)) return;
        link.href = appendCurrentParams(link.href);
      } catch (error) {}
    },
    true,
  );

  if (document.readyState === "complete") {
    window.setTimeout(decorateTrackedLinks, 0);
  } else {
    window.addEventListener("load", decorateTrackedLinks, { once: true });
  }

  window.forwardParamsToCheckout = appendCurrentParams;
})();
