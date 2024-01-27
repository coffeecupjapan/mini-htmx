// [ Specification ]
// using ESM not ES5
//
// hx-get, hx-post
// hx-target
//   -> # / this / find(first selector)
// hx-trigger
//   -> click / load / change
// hx-swap
//   -> innerHTML / beforebegin / beforeend / afterbegin / afterend

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
    const triggerEles = ["load", "click", "change"];
    if (triggerEles.includes(triggerContent)) return triggerContent;
    return "load";
}
function parseSwapAttribute(ele) {
    const swapContent = ele.getAttribute("hx-swap");
    const swapEles = ["innerHTML", "beforebegin", "beforeend", "afterbegin", "afterend"];
    if (swapEles.includes(swapContent)) return swapContent;
    return "innerHTML";
}
function generateEvent(ele, target, method, trigger, swap) {
    ele.addEventListener(trigger, async() => {
        if (!method[1]) return;
        const result = await fetch(method[1], {method: method[0]});
        const json = await result.json();
        const stringifyJson = JSON.stringify(json);
        if (swap === "innerHTML") {
            target.innerHTML = stringifyJson;
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
    allEles.forEach((ele) => {
        const target = parseTargetAttribute(ele);
        const method = parseMethodAttribute(ele);
        const trigger = parseTriggerAttribute(ele);
        const swap = parseSwapAttribute(ele);
        generateEvent(ele, target, method, trigger, swap);
    });
});