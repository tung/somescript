var someScriptBrowserOverlay = {

    sites: [],
    panel: null,

    init: function() {
        someScriptBrowserOverlay.panel = document.getElementById("somescript-panel");
        //update the status...
        //when a document begins loading
        gBrowser.addProgressListener(someScriptBrowserOverlay, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
        //when the active tab changes
        gBrowser.tabContainer.addEventListener("TabSelect", someScriptBrowserOverlay.updateStatus, false);
        //when the pref changes
        someScriptCommon.updateCallbacks.push(someScriptBrowserOverlay.updateStatus);
        //right now
        someScriptBrowserOverlay.updateStatus();
    },

    //nsIWebProgress stuff
    QueryInterface: function(aIID) {
        if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
            aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
            aIID.equals(Components.interfaces.nsISupports))
            return this;
        throw Components.results.NS_NOINTERFACE;
    },
    onLocationChange: function(progress, request, uri) {
        //if it's the current tab that changed, update the status
        if (uri && uri.spec == content.document.location.href) {
            someScriptBrowserOverlay.updateStatus();
        }
    },
    onStateChange: function() {},
    onProgressChange: function() {},
    onStatusChange: function() {},
    onSecurityChange: function() {},
    onLinkIconAvailable: function() {},

    onPageLoad: function(aEvent) {
        if (aEvent.originalTarget == content.document) {
            someScriptBrowserOverlay.updateStatus();
        }
    },

    updateStatus: function() {
        var whitelisted = someScriptCommon.isWhitelisted(content.document.location.href) != null;
        var key = whitelisted ? "whitelisted" : "notWhitelisted";
        someScriptBrowserOverlay.panel.setAttribute("src", whitelisted ? "chrome://somescript/skin/ok.png" : "chrome://somescript/skin/black.png");
        someScriptBrowserOverlay.panel.setAttribute("tooltiptext", someScriptCommon.strings.getFormattedString(key, [someScriptCommon.getSiteString(content.document.location.href)]));
        someScriptBrowserOverlay.panel.setAttribute("whitelisted", whitelisted);
    },

    click: function(event) {
        // Toggle on left (= 0) clicks (middle = 1, right = 2)
        if (event.button == 0)
            someScriptBrowserOverlay.toggle();
    },

    toggle: function() {
        someScriptCommon.whitelist(content.document.location.href, !(someScriptBrowserOverlay.panel.getAttribute("whitelisted") == "true"));
    },

    showMenu: function() {
        var menu = document.getElementById("somescript-menu");
        menu.openPopup(someScriptBrowserOverlay.panel, "before_end", 0, 0, false, false);
    }

}

window.addEventListener("load", someScriptBrowserOverlay.init, false);
