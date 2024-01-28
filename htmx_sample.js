// [ Specification ]
// using ESM not ES5
//
// hx-get, hx-post
// hx-target
//   -> # / this / find(first selector) / next / previous
// hx-trigger
//   -> click / load / change / revealed / intersect
// hx-swap
//   -> innerHTML / outerHTML / beforebegin / beforeend / afterbegin / afterend
// hx-json
//   -> access to json element

let windowIsScrolling = false;

function findAllTriggers(ele) {
    const result = ele.querySelectorAll("[hx-trigger]");
    return result;
}
function parseTargetAttribute(ele) {
    const targetContent = ele.getAttribute("hx-target");
    if (targetContent[0] === "#") {
        const id = targetContent.slice(1);
        const targetEle = document.getElementById(id);
        return targetEle;
    } else if (targetContent === "this") {
        return ele;
    } else if (targetContent === "next") {
        return ele.nextElementSibling;
    } else if (targetContent === "previous") {
        return ele.previousElementSibling;
    } else if (targetContent.slice(0, 5) === "next ") {
        const className = targetContent.slice(5);
        const targetEles = document.getElementsByClassName(className);
        let targetResult = null;
        if (targetEles.length) {
            Array.from(targetEles).forEach((targetEle) => {
                if (targetEle.compareDocumentPosition(ele) & Node.DOCUMENT_POSITION_PRECEDING) targetResult = targetEle
            })
        }
        return targetResult;
    } else if (targetContent.slice(0, 9) === "previous ") {
        const className = targetContent.slice(9);
        const targetEles = document.getElementsByClassName(className);
        let targetResult = null;
        if (targetEles.length) {
            Array.from(targetEles).forEach((targetEle) => {
                if (targetEle.compareDocumentPosition(ele) & Node.DOCUMENT_POSITION_FOLLOWING) targetResult = targetEle
            })
        }
        return targetResult;
    } else if (targetContent.slice(0, 5) === "find ") {
        const className = targetContent.slice(5);
        const targetEle = document.getElementsByClassName(className);
        if (targetEle.length) return targetEle[0];
        return null;
    }
    return ele;
}
function parseMethodAttribute(ele) {
    const getContent = ele.getAttribute("hx-get");
    const postContent = ele.getAttribute("hx-post");
    if (getContent) return ["get", getContent];
    if (postContent) return ["post", postContent];
    return ["get", undefined];
}
function parseTriggerAttribute(ele) {
    const triggerContent = ele.getAttribute("hx-trigger");
    const triggerEles = ["load", "click", "change", "revealed", "intersect"];
    if (triggerEles.includes(triggerContent)) return triggerContent;
    return "load";
}
function parseSwapAttribute(ele) {
    const swapContent = ele.getAttribute("hx-swap");
    const swapEles = ["innerHTML", "outerHTML", "beforebegin", "beforeend", "afterbegin", "afterend"];
    if (swapEles.includes(swapContent)) return swapContent;
    return "innerHTML";
}
function parseJsonElement(ele) {
    const jsonElement = ele.getAttribute("hx-json");
    if (!jsonElement) return null;
    const isJsonArrayObjectCorrect = jsonElement.split(/(\[[^\[\]]*\])/g).filter((seg) => {
        return seg.slice(0,1) === "[" && seg.slice(-1) === "]"}).map((seg) => {
        return seg.slice(1, -1)}).every((seg) => {
        return !isNaN(parseInt(seg)) ||
               (seg.slice(0, 1) === "\"" && seg.slice(-1) === "\"" && !seg.slice(1, -1).includes("\"") )||
               (seg.slice(0, 1) === "'" && seg.slice(-1) === "'" && !seg.slice(1, -1).includes("'") )
    });
    if (!isJsonArrayObjectCorrect) return null;
    const jsonSplitArrayObject = jsonElement.split(/(\[(?:[1-9]\d*|0|["'][a-zA-Z][a-zA-Z0-9_]*["'])\])/g);
    const parsedJsonElement = jsonSplitArrayObject.map((seg) => {
        if ((seg.startsWith("[\"") && seg.endsWith("\"]")) || (seg.startsWith("['") && seg.endsWith("']"))) {
            return seg.slice(2, -2);
        }
        if (seg.startsWith("[") && seg.endsWith("]") && !isNaN(parseInt(seg.slice(1, -1)))) {
            return parseInt(seg.slice(1, -1));
        }
        if (seg.match(/^([\.a-zA-Z][\.a-zA-Z0-9_]*)$/g)) {
            return seg.split(".");
        }
        return null;
    }).flat().filter((seg) => (Boolean(seg) || seg === 0));
    return parsedJsonElement;
}
function generateRevealEvent(eles) {
    document.addEventListener("scroll", () => {
        windowIsScrolling = true;
    });
    eles.forEach((ele) => {
        const target = parseTargetAttribute(ele);
        const method = parseMethodAttribute(ele);
        const trigger = parseTriggerAttribute(ele);
        const swap = parseSwapAttribute(ele);
        const json = parseJsonElement(ele);
        generateEvent(ele, target, method, trigger, swap, json);
    })
    setInterval(() => {
        if (windowIsScrolling) {
            windowIsScrolling = false;
            eles.forEach((ele) => {
                const rect = ele.getBoundingClientRect();
                const eleTop = rect.top;
                const eleBottom = rect.bottom;
                const isScrolledIntoView = eleTop < window.innerHeight & eleBottom > 0;
                if (isScrolledIntoView) ele.dispatchEvent(new Event("revealed"));
            })
        }
    }, 200)
}
function generateIntersectEvent(eles) {
    eles.forEach((ele) => {
        const target = parseTargetAttribute(ele);
        const method = parseMethodAttribute(ele);
        const trigger = parseTriggerAttribute(ele);
        const swap = parseSwapAttribute(ele);
        const json = parseJsonElement(ele);
        generateEvent(ele, target, method, trigger, swap, json);
    })
    const observer = new IntersectionObserver(function(entries){
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) eles[index].dispatchEvent(new Event("intersect"));
        })
    });
    eles.forEach((ele) => observer.observe(ele));
}
function generateEvent(ele, target, method, trigger, swap, jsonElements) {
    ele.addEventListener(trigger, async() => {
        if (!method[1]) return;
        const result = await fetch(method[1], {method: method[0]});
        let json = await result.json();
        let stringifyJson = JSON.stringify(json);
        if (jsonElements && jsonElements.length) {
            jsonElements.forEach((jsonEle) => {
                json = json[jsonEle];
            })
            stringifyJson = json;
        }
        if (swap === "innerHTML") {
            target.innerHTML = stringifyJson;
        } else if (swap === "outerHTML") {
            target.outerHTML = stringifyJson;
        } else {
            target.insertAdjacentHTML(swap, stringifyJson);
        }
    });
    if (trigger === "load") {
        ele.dispatchEvent(new Event("load"));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const allEles = findAllTriggers(document.body);
    // revealed events
    const revealEles = Array.from(allEles).filter((ele) => ele.getAttribute("hx-trigger") === "revealed");
    if (revealEles.length) generateRevealEvent(revealEles);
    // intersect events
    const intersectEles = Array.from(allEles).filter((ele) => ele.getAttribute("hx-trigger") === "intersect");
    if (intersectEles.length) generateIntersectEvent(intersectEles);
    // common events
    allEles.forEach((ele) => {
        const trigger = parseTriggerAttribute(ele);
        if (["revealed", "intersect"].includes(trigger)) return;
        const target = parseTargetAttribute(ele);
        const method = parseMethodAttribute(ele);
        const swap = parseSwapAttribute(ele);
        const json = parseJsonElement(ele);
        generateEvent(ele, target, method, trigger, swap, json);
    });
});