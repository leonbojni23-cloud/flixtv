(function (w) {
  "use strict";
  var TABS = [["home", "Home"], ["movies", "Movies"], ["tv", "TV Shows"], ["list", "My List"]];
  var AVATARS = ["#e50914", "#2d7ff9", "#27ae60", "#f2a900"];
  var App = {
    header: function (tab) {
      var header = document.getElementById("hdr");
      header.classList.remove("solid");
      if (!tab) { header.innerHTML = ""; return; }
      header.innerHTML = '<div class="hbar" data-row><div class="logo">FLIX<b>TV</b></div>' +
        TABS.map(function (item) {
          return '<button class="tab f' + (item[0] === tab ? ' on' : '') + '" data-act="tab" data-t="' + item[0] + '">' + item[1] + '</button>';
        }).join("") + '<i class="sp"></i><button class="ico f" data-act="tab" data-t="search">' +
        Icons.search + '</button><button class="ico f" data-act="profile" style="background:' +
        AVATARS[Store.get("avatar", 0)] + '">' + Icons.user + '</button></div>';
    },
    toast: function (message) {
      var old = document.getElementById("app-toast");
      if (old) old.parentNode.removeChild(old);
      var toast = document.createElement("div");
      toast.id = "app-toast"; toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
    },
    act: function (element) {
      var data = element.dataset;
      switch (data.act) {
        case "open": Router.go("details", { id: Number(data.id), type: data.type || "movie" }); break;
        case "play":
          if (data.type === "tv" && (!data.season || !data.episode)) {
            Router.go("details", { id: Number(data.id), type: "tv" });
          } else {
            Api.get(Number(data.id), data.type || "movie").then(function (item) {
              Player.open(item, { season: Number(data.season), episode: Number(data.episode) });
            }).catch(function (error) { App.toast(error.message || "Could not open title."); });
          }
          break;
        case "episodes":
          var episode = document.querySelector("#episodes .episode.f");
          if (episode) Nav.at(episode);
          break;
        case "tab": if (Router.cur.name !== data.t) Router.root(data.t); break;
        case "list":
          var added = Store.toggleList(Number(data.id), data.type || "movie");
          element.innerHTML = added ? Icons.check + "In My List" : Icons.plus + "My List";
          break;
        case "key": Screens.search.key(data.k); break;
        case "profile":
          var next = (Store.get("avatar", 0) + 1) % AVATARS.length;
          Store.set("avatar", next); element.style.background = AVATARS[next]; break;
        case "retry": Router.reload(); break;
      }
    },
    back: function () {
      if (Player.isOpen()) { Player.close(); return; }
      if (Router.back()) return;
      if (Router.cur.name !== "home") { Router.root("home"); return; }
      this.exit();
    },
    exit: function () {
      try {
        if (w.webOS && w.webOS.platformBack) w.webOS.platformBack();
        else if (w.PalmSystem && w.PalmSystem.platformBack) w.PalmSystem.platformBack();
        else w.close();
      } catch (error) { try { w.close(); } catch (_) {} }
    },
    key: function (key) {
      if (Player.isOpen()) return;
      var screen = Screens[Router.cur.name];
      if (screen.onKey && screen.onKey(key)) return;
      if (key === "back") this.back();
      else if (key === "enter") { var element = Nav.cur(); if (element) this.act(element); }
      else if (key === "up" || key === "down" || key === "left" || key === "right") Nav.move(key);
    },
    fit: function () {
      var stage = document.getElementById("stage");
      stage.style.transform = "scale(" + Math.min(w.innerWidth / 1920, w.innerHeight / 1080) + ")";
    },
    init: function () {
      Remote.init(function (key) { App.key(key); });
      document.addEventListener("click", function (event) {
        var element = event.target.closest && event.target.closest(".f");
        if (element && Nav.at(element)) App.act(element);
      });
      document.addEventListener("webOSRelaunch", function () {
        try { if (w.PalmSystem && w.PalmSystem.activate) w.PalmSystem.activate(); } catch (_) {}
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden && Player.isOpen()) return;
      });
      this.fit();
      w.addEventListener("resize", function () { App.fit(); });
      Router.root("home");
    }
  };
  w.App = App;
  App.init();
})(window);
