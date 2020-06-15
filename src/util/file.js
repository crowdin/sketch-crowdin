
function getFileName(element) {
    return `Sketch_${element.id}.html`;
}

function getDirectoryName(page) {
    return `Sketch_${page.id}`;
}

export { getFileName, getDirectoryName };