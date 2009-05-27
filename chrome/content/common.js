var someScriptCommon = {

    sites: [],
    prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("capability.policy."),
    prefBranch: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.somescript."),
    io: Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService),
    prompts: Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
    panel: null,
    updateCallbacks: [],
    strings: null,
    unicodeConverter: Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
    iid: "somescript@spheredev.org",
    uninstallObserverService: Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
    installed: true,

    init: function() {
        someScriptCommon.ensureInstall();
        someScriptCommon.unicodeConverter.charset = "UTF-8";
        someScriptCommon.strings = document.getElementById("somescript-strings");
        someScriptCommon.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
        someScriptCommon.prefs.addObserver("somescript.sites", someScriptCommon, false);
        someScriptCommon.uninstallObserverService.addObserver(someScriptCommon, "em-action-requested", false);
        someScriptCommon.reload();
    },

    shutdown: function() {
        someScriptCommon.prefs.removeObserver("somescript.sites", someScriptCommon);
        someScriptCommon.uninstallObserverService.removeObserver(someScriptCommon, "em-action-requested");
    },

    ensureInstall: function () {
        if (someScriptCommon.isInstalled() == null)
            someScriptCommon.install();
    },

    isInstalled: function () {
        var installPref = null;
        try {
            installPref = someScriptCommon.prefBranch.getBoolPref("installed");
        } catch (ex) {
            // Don't throw an exception if pref isn't found, just return null.
        }
        return installPref;
    },

    install: function () {
        // Make sure capability.policy.policynames contains "somescript".
        // Replaces YesScript's ugly XPCOM component.
        try {
            var policyString = someScriptCommon.prefs.getCharPref("policynames");
            var policies = policyString.split(" ");
            if (!/somescript/.test(policies))
                someScriptCommon.prefs.setCharPref("policynames", policyString + " somescript");
        } catch (ex) {
            someScriptCommon.prefs.setCharPref("policynames", "somescript");
        }
        someScriptCommon.installed = true;
        someScriptCommon.prefBranch.setBoolPref("installed", true);
    },

    uninstall: function () {
        // Splice out "somescript" from capability.policy.policynames.
        try {
            var policyString = someScriptCommon.prefs.getCharPref("policynames");
            var policies = policyString.split(" ");
            // I'd use array.indexOf, but it's only supported in JS 1.6+,
            // and I don't know what version(s) of Firefox that corresponds with.
            var found = -1;
            for (var i = 0; i < policies.length; i++) {
                if (policies[i] == "somescript") {
                    found = i;
                    break;
                }
            }
            if (found != -1) {
                policies.splice(found, 1);
                if (policies.length > 1) {
                    someScriptCommon.prefs.setCharPref("policynames", policies.join(" "));
                } else {
                    someScriptCommon.prefs.clearUserPref("policynames");
                }
            }
        } catch (ex) {
            // No capability.policy.policynames? No worries.
        }
        someScriptCommon.installed = false;
        someScriptCommon.prefBranch.clearUserPref("installed");
    },

    observe: function(subject, topic, data) {
        if (topic == "nsPref:changed") {
            someScriptCommon.reload();
            return;
        }

        if (topic == "em-action-requested") {
            var item = subject.QueryInterface(Components.interfaces.nsIUpdateItem);
            if (item.id != someScriptCommon.iid)
                return;
            if (someScriptCommon.installed && (data == "item-uninstalled" || data == "item-disabled"))
                someScriptCommon.uninstall();
            else if (!someScriptCommon.installed && data == "item-cancel-action")
                someScriptCommon.ensureInstall();
        }
    },

    isWhitelisted: function(url) {
        if (someScriptCommon.sites.indexOf(url) != -1)
            return url;
        url = someScriptCommon.getSiteString(url);
        if (someScriptCommon.sites.indexOf(url) != -1)
            return url;
        return null;
    },

    createURI: function(url) {
        return someScriptCommon.io.newURI(url, null, null);
    },

    getSiteString: function(url) {
        //workaround for bug 454339 - look for urls with a port but without a protocol
        if (/^[^:]+:[0-9]{1,4}$/.test(url)) {
            //prepend the protocol (assume http)
            url = "http:" + url;
        }
        var uri = someScriptCommon.createURI(url);
        var scheme = uri.scheme;
        try {
            var host = uri.hostPort;
        } catch (ex) {
            //weird urls like about:blank
            return url;
        }
        return scheme + "://" + host;
    },

    reload: function() {
        //recreate from the pref, converting to unicode, filtering out whitespace and empty strings, and sorting
        var cleanSites = someScriptCommon.prefs.getCharPref("somescript.sites").split(" ");
        for (var i = 0; i < cleanSites.length; i++) {
            cleanSites[i] = this.unicodeConverter.ConvertToUnicode(cleanSites[i]);
        }
        someScriptCommon.sites = cleanSites.filter(function(element) {
            return !(/\s+/.test(element) || element.length == 0);
        }).sort();
        for (var i = 0; i < someScriptCommon.updateCallbacks.length; i++) {
            someScriptCommon.updateCallbacks[i]();
        }
    },

    whitelist: function(url, whitelistValue) {
        var currentWhitelistUrl = someScriptCommon.isWhitelisted(url);
        if (!(whitelistValue ^ (currentWhitelistUrl != null))) {
            //it's already done
            return;
        }
        if (whitelistValue) {
            someScriptCommon.sites.push(someScriptCommon.getSiteString(url));
        } else {
            someScriptCommon.sites.splice(someScriptCommon.sites.indexOf(currentWhitelistUrl), 1);
        }
        someScriptCommon.prefs.setCharPref("somescript.sites", someScriptCommon.getPrefString());
    },

    getPrefString: function() {
        var cleanSites = [];
        for (var i = 0; i < someScriptCommon.sites.length; i++) {
            cleanSites.push(this.cleanURI(someScriptCommon.sites[i]));
        }
        return cleanSites.join(" ");
    },

    cleanURI: function(uri) {
        //convert from unicode for IDN. not something that complicated, but i figured out that i had to do it from NoScript's code
        return this.unicodeConverter.ConvertFromUnicode(uri);
    },

    dump: function() {
        alert("policynames: '" + someScriptCommon.prefs.getCharPref("policynames") + "'\n" +
              "somescript.sites: '" + someScriptCommon.prefs.getCharPref("somescript.sites") + "'\n" +
              "somescript.javascript.enabled: '" + someScriptCommon.prefs.getCharPref("somescript.javascript.enabled") + "'");
    }
}

window.addEventListener("load", someScriptCommon.init, false);
window.addEventListener("unload", someScriptCommon.shutdown, false);
