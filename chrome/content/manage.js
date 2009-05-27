var tree, deleteButton, add, addButton;

function init() {
    deleteButton = document.getElementById("delete");
    addButton = document.getElementById("add-button");
    add = document.getElementById("add");
    tree = document.getElementById("site-list-tree");
    tree.view = new treeView();
    //update when the pref changes
    someScriptCommon.updateCallbacks.push(reload);
}

function treeView() {
    this.rowCount = someScriptCommon.sites.length;
    this.getCellText = function(row, col) {
        return someScriptCommon.sites[row];
    };
    this.getCellValue = function(row, col) {
        return someScriptCommon.sites[row];
    };
    this.setTree = function(treebox) {
        this.treebox = treebox;
    };
    this.isEditable = function(row, col) { return false; };
    this.isContainer = function(row){ return false; };
    this.isSeparator = function(row){ return false; };
    this.isSorted = function(){ return false; };
    this.getLevel = function(row){ return 0; };
    this.getImageSrc = function(row,col){ return null; };
    this.getRowProperties = function(row,props){};
    this.getCellProperties = function(row,col,props){};
    this.getColumnProperties = function(colid,col,props){};
    this.cycleHeader = function(col, elem) {};
    this.performAction = function(action) {};
}

function reload() {
    var row = tree.treeBoxObject.getFirstVisibleRow();
    tree.view = new treeView();
    tree.treeBoxObject.scrollToRow(row);
}

function changeSelection() {
    deleteButton.setAttribute("disabled", getSelectedSites().length == 0);
}

function getSelectedSites() {
    var indices = getSelectedIndices();
    var sites = [];
    for (var i = 0; i < indices.length; i++) {
        sites.push(someScriptCommon.sites[indices[i]]);
    }
    return sites;
}

function getSelectedIndices() {
    var indices = [];
    var rangeCount = tree.view.selection.getRangeCount();
    for (var i = 0; i < rangeCount; i++) {
        var start = {};
        var end = {};
        tree.view.selection.getRangeAt(i,start,end);
        for (var c = start.value; c <= end.value; c++) {
            indices.push(c);
        }
    }
    return indices;
}

function siteListKeyPress(aEvent) {
    //delete
    if (aEvent.keyCode == 46) {
        deleteSiteList();
    }
}

function addKeyPress(aEvent) {
    if (aEvent.keyCode == 13) {
        addSite();
        aEvent.preventDefault();
    }
}

function addInput(aEvent) {
    addButton.disabled = add.value.length == 0
}

function addSite() {
    try {
        someScriptCommon.whitelist(add.value, true);
    } catch (ex) {
        //if this threw when creating the URI, it's not a valid URI
        if (/newURI/.test(ex.message)) {
            //try adding http:// to the start
            try {
                someScriptCommon.whitelist("http://" + add.value, true);
            } catch (ex) {
                if (/newURI/.test(ex.message)) {
                    someScriptCommon.prompts.alert(window, someScriptCommon.strings.getString("invalidSiteTitle"), someScriptCommon.strings.getFormattedString("invalidSiteText", [add.value]));
                } else {
                    throw ex;
                }
            }
        } else {
            throw ex;
        }
    }
    add.value = "";
    add.focus();
    addButton.disabled = true;
}

function deleteSiteList() {
    var sites = getSelectedSites();
    for (var i = 0; i < sites.length; i++) {
        someScriptCommon.whitelist(sites[i], false);
    }
    changeSelection();
}

window.addEventListener("load", init, false);
