self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Heo & Masuri 💕", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag ?? "heo-masuri",
      data: { url: data.url ?? "/" },
    })
  );
});

/**
 * Resolve a push payload's url to a same-origin URL.
 *
 * Why: in the past some payloads were sent with an absolute URL that ended up
 * pointing at the WRONG origin (a misconfigured NEXT_PUBLIC_APP_URL once
 * embedded the Supabase host into the link, so tapping the notification
 * opened a Supabase error page instead of the PWA). Stale notifications can
 * sit on a device for days, so even after the server is fixed, a tap on an
 * old notification still navigates wherever the original payload said.
 *
 * Defence: keep the path/search/hash from the payload, but force the origin
 * to be this service worker's origin. Relative URLs pass through untouched.
 */
function resolveSameOrigin(raw) {
  if (!raw) return "/";
  try {
    const u = new URL(raw, self.location.origin);
    if (u.origin !== self.location.origin) {
      return u.pathname + u.search + u.hash || "/";
    }
    return u.pathname + u.search + u.hash || "/";
  } catch {
    return "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = resolveSameOrigin(event.notification.data?.url);
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("navigate" in client) {
            return client.navigate(url).then(() => client.focus());
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
