import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (!apiKey) {
      console.warn('PostHog API key not found. Analytics disabled.')
      return
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only', // Only create profiles for logged-in users
      capture_pageview: false, // We'll capture pageviews manually
      capture_pageleave: true,
      autocapture: {
        css_selector_allowlist: ['[data-ph-capture]'], // Only autocapture elements with this attribute
      },
      // Privacy-friendly defaults
      disable_session_recording: false, // Enable session recordings
      session_recording: {
        maskAllInputs: true, // Mask all input fields by default
        maskTextSelector: '[data-ph-mask]', // Mask elements with this attribute
      },
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug(false) // Set to true to see debug logs
        }
      },
    })
  }
}

export { posthog }
