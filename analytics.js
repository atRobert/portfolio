import { portfolioConfig } from "./portfolio.config.js";

function createPostHogStub() {
  if (window.posthog?.__SV) return window.posthog;

  const posthog = (window.posthog = window.posthog || []);
  posthog._i = [];
  posthog.__SV = 1;
  posthog.init = (projectToken, options, instanceName = "posthog") => {
    const instance = instanceName === "posthog" ? posthog : (posthog[instanceName] = []);
    const methods = [
      "capture",
      "identify",
      "reset",
      "opt_in_capturing",
      "opt_out_capturing",
      "has_opted_in_capturing",
      "has_opted_out_capturing",
      "set_config",
      "get_distinct_id",
    ];

    methods.forEach((method) => {
      instance[method] = (...args) => instance.push([method, ...args]);
    });

    posthog._i.push([projectToken, options, instanceName]);

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${options.api_host.replace(".i.posthog.com", "-assets.i.posthog.com")}/static/array.js`;
    document.head.appendChild(script);
  };

  return posthog;
}

export function initializeAnalytics() {
  const { posthogProjectToken, posthogHost, enableOnLocalhost } = portfolioConfig.analytics;
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (!posthogProjectToken || (isLocalhost && !enableOnLocalhost)) return false;

  const posthog = createPostHogStub();
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: "2026-05-30",
    cookieless_mode: "always",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    person_profiles: "never",
    before_send: (event) => (event?.event === "$pageview" ? event : null),
  });

  return true;
}

export function track() {
  // Intentionally disabled: this portfolio only records anonymous page views.
}
