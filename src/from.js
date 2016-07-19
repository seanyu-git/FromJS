import processElementsAvailableOnInitialLoad from "../src/tracing/processElementsAvailableOnInitialLoad"
import {enableTracing, disableTracing} from "../src/tracing/tracing"
import babelFunctions from "../src/tracing/babelFunctions"
import saveAndSerializeDOMState from "./ui/saveAndSerializeDOMState"
import initSerializedDataPage from "../src/ui/initSerializedDataPage"
import showFromJSSidebar from "../src/ui/showFromJSSidebar"



window.addEventListener("load", function(){
    if (window.isSerializedDomPage){return}
    if (window.isVis){return}
    processElementsAvailableOnInitialLoad();
})

window.saveAndSerializeDOMState = saveAndSerializeDOMState

Object.keys(babelFunctions).forEach(function(functionName){
    window[functionName] = babelFunctions[functionName]
})

if (!window.isSerializedDomPage){
    enableTracing()
}

setTimeout(function(){
    if (window.isSerializedDomPage){
        initSerializedDataPage(showFromJSSidebar);
    } else {
        setTimeout(function(){
            if (window.isVis) {
                return;
            }

            var btn = $("<button>")
            btn.text("Disable interactions and show analysis")
            btn.click(function(e){
                showFromJSSidebar()
                e.stopPropagation();
            })
            btn.css({
                position: "fixed",
                top: 0,
                right: 0,
                background: "blue",
                color: "white",
                padding: "10px"
            })
            $("body").append(btn)
        }, 4000)
    }
}, 100)
