export default function getValueFromCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
}