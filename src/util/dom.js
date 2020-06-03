import dom from 'sketch/dom';
import * as translationsUtil from './translations';

function getSelectedArtboard(page) {
    return dom.find('Artboard', page).find(e => e.selected);
}

function getSelectedText(page) {
    return dom.find('Text', page).find(e => e.selected);
}

function getSelectedSymbolText(page) {
    const symbols = dom.find('SymbolInstance, [selected=true]', page);
    if (symbols.length > 0) {
        return symbols[0].overrides
            .filter(o => o.selected)
            .find(override => override.affectedLayer.type === 'Text' && override.property === 'stringValue');
    }
}

function getNonArtboardTexts(page) {
    const artboards = dom.find('Artboard', page);
    let stringsInArtboards = [];
    artboards.forEach(artboard => {
        const ids = dom.find('Text', artboard).map(t => t.id);
        stringsInArtboards = stringsInArtboards.concat(ids);
    });
    return dom.find('Text', page).filter(t => !stringsInArtboards.includes(t.id));
}

function getNonArtboardSymbols(page) {
    const allArtboards = dom.find('Artboard', page);
    const allArtboardSymbolsIds = allArtboards
        .map(artboard => dom.find('SymbolInstance', artboard))
        .reduce((x, y) => x.concat(y), [])
        .map(s => s.id);
    const allSymbols = dom.find('SymbolInstance', page);
    return allSymbols.filter(s => !allArtboardSymbolsIds.includes(s.id));
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
    getSelectedArtboard,
    offsetArtboard,
    removeGeneratedArtboards,
    getNonArtboardSymbols,
    getNonArtboardTexts,
    getSelectedText,
    getSelectedSymbolText
};