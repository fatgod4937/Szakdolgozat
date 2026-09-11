self.addEventListener("push", (event) => {
  const payload = event.data
    ? event.data.json()
    : { title: "New Floofs message", body: "You have a new message." };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/images/logo.png",
      badge: "/images/logo.png",
      tag: payload.tag,
      data: { url: payload.url || "/chats" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existingClient = clientList[0];

        if (existingClient) {
          existingClient.focus();
          existingClient.navigate(event.notification.data.url);
          return;
        }

        return clients.openWindow(event.notification.data.url);
      }),
  );
});
