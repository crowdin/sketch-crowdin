import dom from 'sketch/dom';
import * as localStorage from './local-storage';
import { TEXT_TYPE, SYMBOL_TYPE } from '../constants';

function getSelectedArtboard(page) {
    return dom.find('Artboard', page).find(e => e.selected);
}

function getSelectedText(page) {
    //first look into artboards
    let artboards = dom.find('Artboard', page);
    const translatedArtboards = localStorage.getListOfTranslatedElements(page.parent, 'artboard');
    artboards = artboards.filter(artboard => !translatedArtboards.includes(artboard.id));
    for (let i = 0; i < artboards.length; i++) {
        const artboard = artboards[i];
        const texts = getTextElementsInArtboard(artboard);
        const foundInArtboard = texts.find(text => {
            if (text.type === SYMBOL_TYPE) {
                return text.override.selected;
            } else {
                return text.e.selected;
            }
        });
        if (foundInArtboard) {
            if (foundInArtboard.type === SYMBOL_TYPE) {
                return {
                    artboard,
                    element: foundInArtboard.override,
                    type: foundInArtboard.type,
                    id: foundInArtboard.textId
                };
            } else {
                return {
                    artboard,
                    element: foundInArtboard.e,
                    type: foundInArtboard.type,
                    id: foundInArtboard.textId
                };
            }
        }
    }
    //then in outside
    const outsideText = dom.find('Text', page).find(e => e.selected);
    if (outsideText) {
        return { element: outsideText, type: TEXT_TYPE }
    }
    const symbols = dom.find('SymbolInstance, [selected=true]', page);
    if (symbols.length > 0) {
        const override = symbols[0].overrides
            .filter(o => o.selected)
            .find(override => __isSymbolOverrideText(override));
        if (!!override) {
            return {
                element: override, type: SYMBOL_TYPE
            }
        }
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
    const generatedArtboards = localStorage.getListOfTranslatedElements(document, 'artboard');
    const sourceArtboards = dom.find('Artboard', sourcePage);
    const duplicateArtboards = dom.find('Artboard', duplicatePage);
    for (let i = 0; i < sourceArtboards.length; i++) {
        const sourceArtboard = sourceArtboards[i];
        if (generatedArtboards.includes(sourceArtboard.id) && i < duplicateArtboards.length) {
            duplicateArtboards[i].remove();
        }
    }
}

function getTextElementsInArtboard(artboard) {
    const container = {
        x: artboard.frame.width,
        y: artboard.frame.height
    };
    const textElements = dom.find('Text', artboard)
        .map(e => {
            const textId = e.id;
            const text = e.text;
            let parent = e.parent;
            let parentId = parent.id;
            let x = e.frame.x;
            let y = e.frame.y;
            while (parentId !== artboard.id) {
                x += parent.frame.x;
                y += parent.frame.y;
                parent = parent.parent;
                if (!parent) {
                    return null;
                }
                parentId = parent.id;
            }
            return { x, y, textId, text, e, type: TEXT_TYPE };
        });
    const artboardSymbols = dom.find('SymbolInstance', artboard);
    const textsFromSymbols = artboardSymbols
        .map(symbol => {
            return symbol.overrides
                .filter(override => __isSymbolOverrideText(override))
                .map(override => {
                    const text = override.value;
                    const e = override.affectedLayer;
                    const rect = new dom.Rectangle(0, 0, 0, 0);
                    const newRect = rect.changeBasis({
                        from: symbol,
                        to: artboard
                    });
                    let parent = symbol;
                    let parentId = parent.id;
                    let x = e.frame.x + newRect.x;
                    let y = e.frame.y + newRect.y;
                    const nestedSymbol = symbol.overrides.find(ov => __isSymbolOverrideSymbolInstance(ov) && override.path.startsWith(ov.path + '/'));
                    if (!!nestedSymbol) {
                        x += nestedSymbol.affectedLayer.frame.x;
                        y += nestedSymbol.affectedLayer.frame.y;
                    }
                    const parentSymbols = [];
                    parentSymbols.push(symbol.id);
                    while (parentId !== artboard.id) {
                        let current = parent;
                        parent = parent.parent;
                        if (parent.type === 'SymbolMaster') {
                            parent = __getSymbolIstance(artboardSymbols, current.id, parent.id);
                            if (parent !== null) {
                                parentSymbols.push(parent.id);
                            }
                        }
                        if (!parent) {
                            return null;
                        }
                        parentId = parent.id;
                    }
                    if (x >= container.x) {
                        x = container.x - e.frame.width;
                    }
                    if (y >= container.y) {
                        y = container.y - e.frame.height;
                    }
                    return { x, y, textId: parentSymbols.reverse().join('/') + '/' + override.id, text, e, type: SYMBOL_TYPE, override };
                });
        })
        .reduce((x, y) => x.concat(y), []);
    return textElements.concat(textsFromSymbols).filter(el => el !== null);
}

function getSymbolTexts(symbol) {
    return symbol.overrides
        .filter(override => __isSymbolOverrideText(override))
        .map(override => {
            return {
                id: override.id,
                text: override.value
            };
        });
}

function __isSymbolOverrideText(override) {
    return override.affectedLayer.type === 'Text' && override.property === 'stringValue';
}

function __isSymbolOverrideSymbolInstance(override) {
    return override.affectedLayer.type === 'SymbolInstance' && override.property === 'symbolID';
}

//for nested symbols Sketch API returns SymbolMaster instead of SymbolInstance as a parent group
//and therefore we cannot calculate (x,y) of the text
//this function is a workaround to find proper parent element
//https://github.com/sketch-hq/SketchAPI/issues/689
function __getSymbolIstance(symbols, symbolInstanceChildId, symbolMasterParentId) {
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        if (symbol.master.id === symbolMasterParentId) {
            for (let j = 0; j < symbol.overrides.length; j++) {
                const override = symbol.overrides[j];
                if (override.affectedLayer.id === symbolInstanceChildId) {
                    return symbol;
                }
            }
        }
    }
    return null;
}

export {
    getSelectedArtboard,
    offsetArtboard,
    removeGeneratedArtboards,
    getNonArtboardSymbols,
    getNonArtboardTexts,
    getSelectedText,
    getSymbolTexts,
    getTextElementsInArtboard
};