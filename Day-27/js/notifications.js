const Notifications = {
  add(message, type="info") {
    const items = Store.get("notifications", []);
    items.unshift({id:Store.id("NTF"),message,type,date:new Date().toISOString(),read:false});
    Store.set("notifications", items.slice(0,300));
    this.render();
  },
  unreadCount() { return Store.get("notifications", []).filter(item => !item.read).length; },
  render() {
    const items = Store.get("notifications", []);
    const body = document.getElementById("notificationsList");
    const count = this.unreadCount();
    ["navUnread","topUnread"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = count; el.style.display = count ? "" : "none"; }
    });
    if (!body) return;
    body.innerHTML = items.map(item => `<article class="notification-item ${item.read ? "" : "unread"}"><div class="notification-symbol">${item.type==="critical"?"!":item.type==="warning"?"△":"i"}</div><div class="notification-content"><strong>${Store.escape(item.message)}</strong><p>${Store.escape(item.type.toUpperCase())}</p><small>${Store.escape(Store.dateTime(item.date))}</small></div><button class="btn btn-light" data-notification-read="${Store.escape(item.id)}">${item.read?"Read":"Mark read"}</button></article>`).join("") || `<div class="panel empty-state">You're all caught up. No notifications yet.</div>`;
    body.querySelectorAll("[data-notification-read]").forEach(button => button.addEventListener("click", () => this.markRead(button.dataset.notificationRead)));
  },
  markRead(id) {
    Store.set("notifications", Store.get("notifications", []).map(item => item.id === id ? {...item,read:true} : item));
    this.render();
  },
  init() {
    document.getElementById("markAllRead")?.addEventListener("click", () => {
      Store.set("notifications", Store.get("notifications", []).map(item => ({...item,read:true})));
      this.render();
    });
    document.getElementById("notificationShortcut")?.addEventListener("click", () => location.hash = "notifications");
    this.render();
  }
};