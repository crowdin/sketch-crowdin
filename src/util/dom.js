import dom from 'sketch/dom';
import * as localStorage from './local-storage';
import { TEXT_TYPE, SYMBOL_TYPE } from '../constants';

function getSelectedArtboard(page) {
    return dom.find('Artboard', page).find(e => e.selected);
}

function getSelectedText(page) {
    const selectedTexts = [];
    const symbols = dom.find('SymbolInstance, [selected=true]', page);
    const texts = dom.find('Text, [selected=true]', page);

    symbols.forEach(symbol =>
        symbol.overrides
            .filter(override => __isSymbolOverrideText(override))
            .filter(o => !selectedTexts.find(s => s.type === SYMBOL_TYPE && s.element.id === o.id))
            .filter(o => o.selected)
            .forEach(override => {
                let parent = symbol.parent;
                let group;
                while (parent.id !== page.id) {
                    if (parent.type === 'Group') {
                        group = parent;
                        break;
                    }
                    if (!parent || parent.id === parent.parent.id) {
                        break;
                    }
                    parent = parent.parent;
                }
                const artboard = symbol.getParentArtboard();
                selectedTexts.push({
                    element: override,
                    type: SYMBOL_TYPE,
                    id: symbol.id + '/' + override.id,
                    group,
                    artboard
                });
            })
    );
    texts
        .filter(e => !selectedTexts.find(s => s.type === TEXT_TYPE && s.element.id === e.id))
        .forEach(text => {
            let parent = text.parent;
            let group;
            while (parent.id !== page.id) {
                if (parent.type === 'Group') {
                    group = parent;
                    break;
                }
                if (!parent || parent.id === parent.parent.id) {
                    break;
                }
                parent = parent.parent;
            }
            selectedTexts.push({
                element: text,
                type: TEXT_TYPE,
                id: text.id,
                group,
                artboard: text.getParentArtboard()
            });
        });
    return selectedTexts;
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
            const frame = { ...e.frame };
            if (x + e.frame.width >= container.x) {
                frame.width = container.x - x;
            }
            if (y + e.frame.height >= container.y) {
                y = container.y - e.frame.height;
            }
            return { x, y, textId, text, e, type: TEXT_TYPE, frame };
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

                    let parentSymbol = symbol.overrides.find(ov => __isSymbolOverrideSymbolInstance(ov) && ov.path + '/' + e.id === override.path);
                    const master = parentSymbol ? parentSymbol.affectedLayer.master : symbol.master;
                    const masterFrame = master.frame;
                    const symbolFrame = parentSymbol ? parentSymbol.affectedLayer.frame : symbol.frame;
                    parentSymbol = parentSymbol || symbol;

                    const groupFrame = __findGroupFrameForText(e.id, master, []);

                    let x = e.frame.x * (symbolFrame.width / masterFrame.width) + newRect.x + (groupFrame ? groupFrame.x : 0);
                    let y = e.frame.y * (symbolFrame.height / masterFrame.height) + newRect.y + (groupFrame ? groupFrame.y : 0);
                    const nestedSymbols = symbol.overrides.filter(ov => __isSymbolOverrideSymbolInstance(ov) && override.path.startsWith(ov.path + '/'));
                    nestedSymbols.forEach(nestedSymbol => {
                        x += nestedSymbol.affectedLayer.frame.x;
                        y += nestedSymbol.affectedLayer.frame.y;
                    });
                    const frame = { ...e.frame };
                    if (x + e.frame.width >= container.x) {
                        frame.width = container.x - x;
                    }
                    if (y + e.frame.height >= container.y) {
                        y = container.y - e.frame.height;
                    }
                    return { x, y, textId: symbol.id + '/' + override.id, text, e, frame, type: SYMBOL_TYPE, override };
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

function __findGroupFrameForText(textId, group, previousFrames) {
    for (const layer of group.layers) {
        if (layer.type === 'Text' && layer.id === textId && group.type === 'Group') {
            return previousFrames.reduce(
                (ac, cur) => {
                    ac.x += cur.x;
                    ac.y += cur.y;
                    return ac;
                },
                { x: 0, y: 0 }
            )
        } else if (layer.type === 'Group') {
            const e = __findGroupFrameForText(
                textId,
                layer,
                previousFrames.concat({
                    x: layer.frame.x,
                    y: layer.frame.y,
                })
            );
            if (!!e) {
                return e;
            }
        }
    }
}

export {
    getSelectedArtboard,
    offsetArtboard,
    removeGeneratedArtboards,
    getSelectedText,
    getSymbolTexts,
    getTextElementsInArtboard
};