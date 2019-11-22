import dom from 'sketch/dom';
import cheerio from 'cheerio';
import * as domUtil from './dom';

function convertOutsideTextToHtml(page) {
    const artboards = dom.find('Artboard', page);
    let stringsInArtboards = [];
    artboards.forEach(artboard => {
        const ids = dom.find('Text', artboard).map(t => t.id);
        stringsInArtboards = stringsInArtboards.concat(ids);
    })
    const outsideText = dom.find('Text', page).filter(t => !stringsInArtboards.includes(t.id));
    let html = '<html>';
    html += '<body>';
    outsideText.forEach(t => html += `<div id="${t.id}">${t.text}</div>`);
    html += '</body>';
    html += '</html>';
    return html;
}

function convertArtboardToHtml(page, artboard) {
    const container = {
        x: artboard.frame.width,
        y: artboard.frame.height
    };
    const textElements = dom.find('Text', artboard).map(e => {
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
    let textHtml = '';
    textElements.forEach(t => {
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
        textHtml += `<div id="${t.textId}" style="${style}">${t.text}</div>`;
    });
    const copy = artboard.duplicate();
    domUtil.offsetArtboard(page, copy);
    dom.find('Text', copy).forEach(t => t.remove());
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
            text: cheerio.text($(string))
        });
    }
    return result;
}

export { convertArtboardToHtml, convertOutsideTextToHtml, parseHtmlForText }