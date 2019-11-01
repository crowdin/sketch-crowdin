import ui from 'sketch/ui';
import settings from 'sketch/settings';
import dom from 'sketch/dom';
import crowdin, { HttpClientType } from '@crowdin/crowdin-api-client';
import { ACCESS_TOKEN_KEY, ORGANIZATION } from './constants';

function createClient() {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    const organization = settings.settingForKey(ORGANIZATION);
    if (!token) {
        throw 'Please set access token';
    }
    return new crowdin({ token, organization }, { httpClientType: HttpClientType.FETCH });
}

function handleError(error) {
    if (typeof error === 'string' || error instanceof String) {
        ui.message(error);
    } else {
        ui.message(`An error occurred ${JSON.stringify(error)}`);
    }
}

function removeTranslatedPage(doc, sourcePageId, languageName) {
    const pages = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    const translatedPages = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    if (!!pages) {
        let arr = pages
            .split(',')
            .map(p => {
                const parts = p.split('=>');
                return {
                    sourceId: parts[0],
                    translatedId: parts[1]
                }
            });
        const foundRecord = arr.find(p => p.sourceId === sourcePageId);
        if (!!foundRecord) {
            const pageToRemove = doc.pages.find(p => p.id === foundRecord.translatedId);
            if (!!pageToRemove) {
                pageToRemove.remove();
            }
            if (!!translatedPages) {
                const translatedPagesNew = translatedPages.split(',').filter(p => p !== foundRecord.translatedId).join(',');
                settings.setDocumentSettingForKey(doc, `crowdin-translated-pages`, translatedPagesNew);
            }
        }
        const newValue = arr
            .filter(p => p.sourceId !== sourcePageId)
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-pages`, newValue);
    }
}

function addTranslatedPage(doc, sourcePageId, translatedId, languageName) {
    let pages = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    let translatedPages = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    if (!pages) {
        pages = `${sourcePageId}=>${translatedId}`;
        translatedPages = translatedId;
    } else {
        pages += `,${sourcePageId}=>${translatedId}`;
        translatedPages += `,${translatedId}`;
    }
    settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-pages`, pages);
    settings.setDocumentSettingForKey(doc, `crowdin-translated-pages`, translatedPages);
}

function getListOfTranslatedPages(doc) {
    const translatedPages = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    if (!translatedPages) {
        return [];
    }
    return translatedPages.split(',');
}

function getSelectedArtboard(page) {
    return dom.find('Artboard', page).find(e => e.selected);
}

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
    outsideText.forEach(t => html += `<div id="${t.textId}">${t.text}</div>`);
    html += '</body>';
    html += '</html>';
    return html;
}

function convertArtboardToHtml(artboard) {
    const buffer = dom.export(artboard, {
        output: false
    });
    const artBoardImage = buffer.toString('base64');
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
        return { x, y, textId, text };
    });
    let html = '<html>';
    html += '<body>';
    html += '<div style="position: relative;">';
    html += `<img style="width:${container.x}px;height:${container.y}px;" src="data:image/png;base64,${artBoardImage}">`;
    textElements.forEach(t => html += `<div id="${t.textId}" style="position: absolute;top:${t.y}px;left:${t.x}px;">${t.text}</div>`);
    html += '</div>';
    html += '</body>';
    html += '</html>';
    return html;
}

export {
    createClient, handleError, removeTranslatedPage, addTranslatedPage,
    getListOfTranslatedPages, convertArtboardToHtml, convertOutsideTextToHtml,
    getSelectedArtboard
};