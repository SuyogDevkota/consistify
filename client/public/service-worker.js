self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'There is new community activity.' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Consistify update', {
      body: payload.body || 'There is new activity in your community.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: payload.tag || 'consistify-activity',
      data: { url: payload.url || '/app' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url || '/app', self.location.origin);
  const targetUrl = (
    requestedUrl.origin === self.location.origin
      ? requestedUrl
      : new URL('/app', self.location.origin)
  ).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
