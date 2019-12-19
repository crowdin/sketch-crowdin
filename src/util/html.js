import dom from 'sketch/dom';
import cheerio from 'cheerio';
import * as domUtil from './dom';

const symbolOverrideType = 'symbol-override';
const textType = 'text';

function convertOutsideTextToHtml(page) {
    const outsideText = domUtil.getNonArtboardTexts(page);
    const outsideSymbols = domUtil.getNonArtboardSymbols(page);
    let html = '<html>';
    html += '<body>';
    outsideText.forEach(t => html += `<div id="${t.id}" type="${textType}">${t.text}</div>`);
    outsideSymbols.forEach(outsideSymbol => {
        getSymbolTexts(outsideSymbol)
            .forEach(override => {
                html += `<div id="${override.id}" type="${symbolOverrideType}">${override.text}</div>`
            });
    });
    html += '</body>';
    html += '</html>';
    return html;
}

function getSymbolTexts(symbol) {
    return symbol.overrides
        .filter(override => override.affectedLayer.type === 'Text')
        .map(override => {
            return {
                id: override.id,
                text: override.value
            };
        });
}

function convertArtboardToHtml(page, artboard) {
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
                parentId = parent.id;
            }
            return { x, y, textId, text, e };
        });
    const textsFromSymbols = dom.find('SymbolInstance', artboard)
        .map(symbol => {
            return symbol.overrides
                .filter(override => override.affectedLayer.type === 'Text')
                .map(override => {
                    const textId = override.id;
                    const text = override.value;
                    const e = override.affectedLayer;
                    let parent = symbol;
                    let parentId = parent.id;
                    let x = e.frame.x;
                    let y = e.frame.y;
                    while (parentId !== artboard.id) {
                        x += parent.frame.x;
                        y += parent.frame.y;
                        let current = parent;
                        parent = parent.parent;
                        if (parent.type === 'SymbolMaster') {
                            //TODO fix coordinates
                            parent = getSymbolIstance(artboard, current.id, parentId);
                            if (parent === null) {
                                return null;
                            }
                        }
                        parentId = parent.id;
                    }
                    return { x, y, textId, text, e, type: symbolOverrideType };
                })
                .filter(el => el !== null);
        })
        .reduce((x, y) => x.concat(y), []);
    const allTexts = textElements.concat(textsFromSymbols);
    let textHtml = '';
    allTexts.forEach(t => {
        let style = `position: absolute;top:${t.y}px;left:${t.x}px;`;
        style += `width:${t.e.frame.width}px;`;
        if (!!t.e.style) {
            if (!!t.e.style.fontFamily) {
                style += `font-family:${t.e.style.fontFamily};`;
            }
            if (!!t.e.style.textColor) {
                style += `color:${t.e.style.textColor};`;
            }
            if (!!t.e.style.fontSize) {
                style += `font-size:${t.e.style.fontSize}px;`;
            }
            if (!!t.e.style.fontStyle) {
                style += `font-style:${t.e.style.fontStyle};`;
            }
            if (!!t.e.style.opacity) {
                style += `opacity:${t.e.style.opacity};`;
            }
            if (!!t.e.style.textTransform) {
                style += `text-transform:${t.e.style.textTransform};`;
            }
            if (!!t.e.style.fontVariant) {
                style += `font-variant:${t.e.style.fontVariant};`;
            }
            if (!!t.e.style.fontStretch) {
                style += `font-stretch:${t.e.style.fontStretch};`;
            }
        }
        textHtml += `<div id="${t.textId}" type="${t.type}" style="${style}">${t.text}</div>`;
    });
    //creating temp artboard with empty texts for exporting
    const copy = artboard.duplicate();
    domUtil.offsetArtboard(page, copy);
    dom.find('Text', copy).forEach(t => t.remove());
    dom.find('SymbolInstance', copy)
        .forEach(symbol => symbol.overrides
            .filter(override => override.affectedLayer.type === 'Text')
            .forEach(override => override.value = ' ')
        );
    const buffer = dom.export(copy, {
        output: false
    });
    const artBoardImage = buffer.toString('base64');
    copy.remove();
    let html = '<html>';
    html += '<body>';
    html += '<div style="position: relative;">';
    html += `<img style="width:${container.x}px;height:${container.y}px;" src="data:image/png;base64,${artBoardImage}">`;
    html += textHtml;
    html += '</div>';
    html += '</body>';
    html += '</html>';
    return html;
}

//for nested symbols Sketch API returns SymbolMaster instead of SymbolInstance as a parent group
//and therefore we cannot calculate (x,y) of the text
//this function is a workaround to find proper parent element
//https://github.com/sketch-hq/SketchAPI/issues/689
function getSymbolIstance(artboard, symbolInstanceChildId, symbolMasterParentId) {
    const symbols = dom.find('SymbolInstance', artboard);
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        if (symbol.master.id === symbolMasterParentId) {
            for (let j = 0; j < symbol.overrides.length; j++) {
                const override = symbol.overrides[j];
                if (override.affectedLayer.type === 'SymbolInstance' && override.affectedLayer.id === symbolInstanceChildId) {
                    return symbol;
                }
            }
        }
    }
    return null;
}

function parseHtmlForText(html) {
    const $ = cheerio.load(html);
    const strings = $('div[id]');
    let result = [];
    for (let i = 0; i < strings.length; i++) {
        const string = strings[i];
        result.push({
            id: string.attribs.id,
            text: cheerio.text($(string))
        });
    }
    return result;
}

export { convertArtboardToHtml, convertOutsideTextToHtml, parseHtmlForText }