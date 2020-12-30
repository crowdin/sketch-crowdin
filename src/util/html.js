import dom from 'sketch/dom';
import cheerio from 'cheerio';
import * as domUtil from './dom';
import { SYMBOL_TYPE, TEXT_TYPE } from '../constants';

function convertOutsideTextToHtml(page) {
    const outsideText = dom.find('Text', page).filter(e => !e.getParentArtboard());
    const outsideSymbols = dom.find('SymbolInstance', page).filter(e => !e.getParentArtboard());
    let html = '<html>';
    html += '<body>';
    outsideText.forEach(t => html += `<div id="${t.id}" stype="${TEXT_TYPE}">${t.text}</div>`);
    outsideSymbols.forEach(outsideSymbol => {
        domUtil.getSymbolTexts(outsideSymbol)
            .forEach(override => {
                html += `<div id="${outsideSymbol.id + '/' + override.id}" stype="${SYMBOL_TYPE}">${override.text}</div>`
            });
    });
    html += '</body>';
    html += '</html>';
    return html;
}

function convertArtboardToHtml(page, artboard) {
    const container = {
        x: artboard.frame.width,
        y: artboard.frame.height
    };
    const allTexts = domUtil.getTextElementsInArtboard(artboard);
    let textHtml = '';
    allTexts.forEach(t => {
        let style = `position: absolute;top:${t.y}px;left:${t.x}px;`;
        style += `width:${t.frame.width}px;`;
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
        textHtml += `<div id="${t.textId}" stype="${t.type}" style="${style}"`;
        if (t.symbolId) {
            textHtml += ` symbol="${t.symbolId}"`;
        }
        textHtml += `>${t.text}</div>`;
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

function parseHtmlForText(html) {
    const $ = cheerio.load(html);
    const strings = $('div[id]');
    let result = [];
    for (let i = 0; i < strings.length; i++) {
        const string = strings[i];
        result.push({
            id: string.attribs.id,
            text: cheerio.text($(string)),
            type: string.attribs.stype || TEXT_TYPE
        });
    }
    return result;
}

export { convertArtboardToHtml, convertOutsideTextToHtml, parseHtmlForText };