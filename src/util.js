import ui from 'sketch/ui';
import settings from 'sketch/settings';
import crowdin, { HttpClientType } from '@crowdin/crowdin-api-client';
import { ACCESS_TOKEN_KEY, ORGANIZATION } from './constants';
import { translatePage } from './plugin';

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

export { createClient, handleError, removeTranslatedPage, addTranslatedPage, getListOfTranslatedPages };