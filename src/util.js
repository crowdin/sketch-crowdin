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

function removeTranslatedElement(doc, sourceElementId, languageName, type) {
    const elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-${type}s`);
    const translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-${type}s`);
    if (!!elements) {
        let arr = elements
            .split(',')
            .map(p => {
                const parts = p.split('=>');
                return {
                    sourceId: parts[0],
                    translatedId: parts[1]
                }
            });
        const foundRecord = arr.find(p => p.sourceId === sourceElementId);
        if (!!foundRecord) {
            let elementToRemove;
            if (type === 'page') {
                elementToRemove = doc.pages.find(p => p.id === foundRecord.translatedId);
            } else if (type === 'artboard') {
                for (let i = 0; i < doc.pages.length; i++) {
                    const page = doc.pages[i];
                    const artboards = dom.find('Artboard', page);
                    for (let j = 0; j < artboards.length; j++) {
                        if (artboards[j].id === foundRecord.translatedId) {
                            elementToRemove = artboards[j];
                            break;
                        }
                    }
                    if (!!elementToRemove) {
                        break;
                    }
                }
            }
            if (!!elementToRemove) {
                elementToRemove.remove();
            }
            if (!!translatedElements) {
                const translatedElementsNew = translatedElements.split(',').filter(p => p !== foundRecord.translatedId).join(',');
                settings.setDocumentSettingForKey(doc, `crowdin-translated-${type}s`, translatedElementsNew);
            }
        }
        const newValue = arr
            .filter(p => p.sourceId !== sourceElementId)
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-${type}s`, newValue);
    }
}

function addTranslatedElement(doc, sourceElementId, translatedId, languageName, type) {
    let elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-${type}s`);
    let translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-${type}s`);
    if (!elements) {
        elements = `${sourceElementId}=>${translatedId}`;
        translatedElements = translatedId;
    } else {
        elements += `,${sourceElementId}=>${translatedId}`;
        translatedElements += `,${translatedId}`;
    }
    settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-${type}s`, elements);
    settings.setDocumentSettingForKey(doc, `crowdin-translated-${type}s`, translatedElements);
}

function getListOfTranslatedElements(doc, type) {
    const translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-${type}s`);
    if (!translatedElements) {
        return [];
    }
    return translatedElements.split(',');
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
    createClient, handleError, removeTranslatedElement, addTranslatedElement,
    getListOfTranslatedElements, convertArtboardToHtml, convertOutsideTextToHtml,
    getSelectedArtboard
};