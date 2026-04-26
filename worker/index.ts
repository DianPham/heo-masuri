/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  };

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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("navigate" in client) {
            return (client as WindowClient).navigate(url).then(() => client.focus());
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
