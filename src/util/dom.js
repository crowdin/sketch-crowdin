import dom from 'sketch/dom';
import * as translationsUtil from './translations';

function getSelectedArtboard(page) {
    return dom.find('Artboard', page).find(e => e.selected);
}

function offsetArtboard(page, artboard) {
    const minY = page.layers
        .map(l => l.frame)
        .map(l => {
            const x = l.x;
            const y = l.y;
            return { x, y };
        })
        .reduce(function (prev, current) {
            return (prev.y < current.y) ? prev : current
        }).y;
    artboard.frame.offset(0, - (artboard.frame.y - minY + artboard.frame.height + 100));
}

function removeGeneratedArtboards(document, sourcePage, duplicatePage) {
    const generatedArtboards = translationsUtil.getListOfTranslatedElements(document, 'artboard');
    const sourceArtboards = dom.find('Artboard', sourcePage);
    const duplicateArtboards = dom.find('Artboard', duplicatePage);
    for (let i = 0; i < sourceArtboards.length; i++) {
        const sourceArtboard = sourceArtboards[i];
        if (generatedArtboards.includes(sourceArtboard.id) && i < duplicateArtboards.length) {
            duplicateArtboards[i].remove();
        }
    }
}

export {
    getSelectedArtboard, offsetArtboard, removeGeneratedArtboards
};