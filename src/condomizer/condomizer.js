/*

 condomizer.js by Shmulik Shnoll & Yossi Eilaty
 
 condomizer.js allows you to run a jQuery component within an anonymous iFrame (iFrame without a src URL). Running a componnent
 from within anonymous iFrame acts as a condom: 
 1) It protects the component: when running in an iFrame the component is not affected by neither CSS rules defined in the main
    window nor does it collide with any JS components / variables / functions running in the main window.
 2) It protects the main window: when the jQuery component is running in an iFrame any CSS rules it defined as well as any JS
    entities it creates have no effect on the main window.
    
*/
(function( $ ) {
    var count = 0;
    var defaults = {
        width : "100%",
        height : "100%",
        content : "<!DOCTYPE HTML><html><head></head><body></body></html>",
        useReadyStateForDynamicScripts : $.browser.msie && parseInt($.browser.version, 10) < 10
    };

    function createIframe(container) {
        function generateUniqueId() {
            return "condomizer-" + count;
        }

        function createRootElementIfNotExists (w, elementName) {
//    console.log("creating element " + elementName + " if it does not exist");
            var rootNode = w.document.getElementsByTagName(elementName);
            if (rootNode[0] == null) {
//      console.log("creating element " + elementName + " because it did not exist!");
                w.document.getElementsByTagName('html')[0].appendChild(w.document.createElement(elementName));
                rootNode = w.document.getElementsByTagName(elementName);
                if (rootNode[0] == null)
                    throw "couldn't get at " + elementName + " of iframe";
            }
        }

        function addNodeToDocumentAndCallback (w, node, url, callback, targetElement) {
            if (callback != null) {
//      console.log("creating callback for url " + url);
                if (container.settings.useReadyStateForDynamicScripts) {
                    node.onreadystatechange = function () {
//          console.log("callback node readystatechange=" + node.readyState + " for url " + url);
                        if (!arguments.callee.callbackAlreadyCalled && node.readyState == 'loaded') {
                            arguments.callee.callbackAlreadyCalled = true;
                            callback.call(w);
                        }
                    } 
                } else {
//                console.log("assigning onload");
                    node.onload = function () {
//                    console.log("callback node onload for url " + url);
//                    console.log("calling callback");
                        callback.call(w);
                    }
                }
            }

            if (targetElement)
                targetElement.appendChild(node);
            else {
                var headNode = w.document.getElementsByTagName('head');
                if (headNode[0] != null)
                    headNode[0].appendChild(node);
                else
                    throw "Need head to continue";
            }
        }

        function createScript (w, url, callback, targetElement) {
//    console.log("Start inject script src to " + url);
            var scriptNode = w.document.createElement('script');
            scriptNode.type = 'text/javascript';

            addNodeToDocumentAndCallback(w, scriptNode, url, callback, targetElement);

            scriptNode.src = url;

//    console.log("Finished inject script src to " + url);
        }

        function isCssLoaded (w, node, domNodeToCheck, propertyToCheck, valueToCheck) {
            return w.jQuery(domNodeToCheck).css(propertyToCheck) == valueToCheck;
        }

        function createCss (w, css) {
            var linkNode = w.document.createElement('link');
            linkNode.rel = 'stylesheet';
            linkNode.type = 'text/css';

            linkNode.href = css.url;
            return linkNode;
        }

        function f1() {
            function addScripts(){
                try {
        //                console.log("addScripts");
                    var script = scripts.shift();
                    if (script)
                        createScript(iframeElement.contentWindow, script, addScripts);
                    else {
        //                    console.log("about to inject content");
                        iframeElement.contentWindow.document.body.innerHTML = container.content;
                        runPlugins(iframeElement.contentWindow);
                    }
                } catch (e){}
            }

            function funcCallBuilder(w, selector, func, opts){
                w.jQuery.fn[func].apply($(selector), [opts]);
            }

            function addCsses() {
                var headFound = true;
//                console.log("addCsses");
                try {
                    if (csss.length) {
                        var headNode = iframeElement.contentWindow.document.getElementsByTagName('head');
                        if (headNode[0] != null) {
                            headNode = headNode[0]; //.appendChild(linkNode);
                            var css = csss.shift();
                            while (css) {
                                headNode.appendChild(createCss(iframeElement.contentWindow, css));
                                css = csss.shift()
                            }
                        }
                        else
                            headFound = false;
                    }
                } catch (e){}
                if (!headFound)
                    throw "Need head to continue";
            }

            function runPlugins(w) {
                // the following line is due to a weird chrome behavior - without this line, sometimes, usually when
                // chrome cache is already warm, the inner width of the iframe is reported to be 0, this line resolves
                // the problem
                var forChrome = $(iframeElement).parent().width();
                var root = $(iframeElement.contentWindow.document.body).children(":first");
                $.each(plugins, function (index, plugin) {
                    funcCallBuilder(w, root, plugin.name, plugin.options);
                });
            }

            try {

                // Why do I run this code in a timeout (and not immediately)? Because if I don't, IE8 creates the iframe with a border (even if I specify
                // noborder). This problem happens ONLY if this code runs inside an iframe, i.e. the content-player.js is injected into an iframe to.

                var scripts = container.settings.scripts && container.settings.scripts.length ? container.settings.scripts.slice(0) : [];
                var csss = container.settings.css && container.settings.css.length ? container.settings.css.slice(0) : [];
                var plugins = container.settings.plugins && container.settings.plugins.length ? container.settings.plugins.slice(0) : [];

                createRootElementIfNotExists(iframeElement.contentWindow, 'head');
                createRootElementIfNotExists(iframeElement.contentWindow, 'body');
                $(iframeElement.contentWindow.document.body).addClass("condomizer-in-iframe");

                addCsses();
                addScripts();
            } catch(e) {/*ilb*/}

        }

        var $container = $(container);
        var iframeElement;

        // hack for Dell UK  -- start
        // original code : iframeElement = document.createElement("iframe");

        if (window.Bootstrapper && window.Bootstrapper.ensCreateElement)
            iframeElement = window.Bootstrapper.ensCreateElement.call(document, "iframe");
        else
            iframeElement = document.createElement("iframe");

        // hack for Dell UK  -- end

        iframeElement.frameBorder = "no";
        iframeElement.scrolling = "no";
        if (container.settings.enableFullScreen) {
            iframeElement.setAttribute("allowfullscreen", true);
            iframeElement.setAttribute("webkitallowfullscreen", true);
            iframeElement.setAttribute("mozallowfullscreen", true);
        }
        var iframeId = generateUniqueId();
        count++;
        var init = true;
        container.content = container.content || container.outerHTML;

        var $iframeElement = $(iframeElement);
        $iframeElement.attr("id", iframeId).css({width : container.settings.width, height : container.settings.height});

        $container.html("");

        container.appendChild(iframeElement);

        $iframeElement.load(function(){
            try {
                //      console.log("iframe loaded : " + iframeId + " divs: " + $(iframeElement.contentWindow.document).find("div").size() + " init: " + init);
                if ($(iframeElement.contentWindow.document).find("div").size() == 0 && !init)
                    $container.condomizer();
            } catch (e){/*ilb*/}
        });

        try {
            // all browsers, except IE, if you don't open and then close the document, flashes start behaving erratically. Specifically, any api they
            // export is lost! In IE, on the other hand, you are not allowed to open the document again if the parent window has document domain set (access denied).
//      console.log("opening/closing iframe document to deal with problems in flash in non-ie browsers");
            iframeElement.contentWindow.document.open();
            iframeElement.contentWindow.document.write('<!DOCTYPE html>');
            iframeElement.contentWindow.document.close();
//      console.log("successfully opened/closed iframe document to deal with problems in flash in non-ie browsers");
        } catch (e) {
            // what is this? This is to solve the problem in IE6-8 where if the target document has a document.domain, then one cannot access
            // the window of even an anonymous iframe. The solution is documented in http://stackoverflow.com/questions/1886547/access-is-denied-javascript-error-when-trying-to-access-the-document-object-of and
            // http://www.telerik.com/community/forums/aspnet-ajax/editor/document-domain-access-denied-in-ie-6.aspx.
            // Note that this is not enough. The rest of the code MUST run inside a "window.setTimeout", but fortunately, We already have one due to the
            // bug that is documented below.
//      console.log("adding src with document.domain hack to iframe to " + iframeElement.ownerDocument.domain);
            iframeElement.src = "javascript:void((function(){document.open();document.domain=\'" + iframeElement.ownerDocument.domain + "\';document.write('<!DOCTYPE html>');document.close();})())";
        }

        init = false;

        setTimeout(function() {
            f1();
        } ,0);

        $container.data("framable-methods", {});
    }

    function init (options) {
        return this.each(function(){
            var temp = {};
            if (!this.settings) {
                this.settings = {};
            }
            $.extend(true, temp, defaults, this.settings, options);
            this.settings = temp;
            createIframe(this);
        });
    }

    function runMethod(method) {
        arguments.shift();
        return this.each(function(){
            var methods = $(this).data("framable-methods");
            if(methods[method])
                methods[method].apply(this, arguments);
        });
    }

    $.fn.condomizer = function(method) {
        if ( typeof method === 'object' || !method ) {
            return init.apply(this, arguments );
        } else if (typeof method === "string" && methods[method]) {
            return runMethod.apply(this, arguments );
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.condomizer');
            return this;
        }
    };
})(jQuery);