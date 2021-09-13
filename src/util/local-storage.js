import settings from 'sketch/settings';
import { OVERRIDE_TRANSLATIONS } from '../constants';

function removeTranslatedPages(doc, sourceElementId, languageName) {
    //remove translated pages which were deleted manually by user
    syncStorage(doc, sourceElementId, languageName);
    const remove = !!settings.documentSettingForKey(doc, OVERRIDE_TRANSLATIONS);
    if (!remove) {
        return;
    }
    const pages = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    const translatedPages = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    const deletedTranslatedPageIds = [];
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
        arr
            .filter(p => p.sourceId === sourceElementId)
            .forEach(foundRecord => {
                let pageToRemove = doc.pages.find(p => p.id === foundRecord.translatedId);
                deletedTranslatedPageIds.push(foundRecord.translatedId);
                if (!!pageToRemove) {
                    pageToRemove.remove();
                }
            });
        if (!!translatedPages) {
            const translatedPagesNew = translatedPages.split(',').filter(p => !deletedTranslatedPageIds.includes(p)).join(',');
            settings.setDocumentSettingForKey(doc, `crowdin-translated-pages`, translatedPagesNew);
        }
        const newValue = arr
            .filter(p => p.sourceId !== sourceElementId)
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-pages`, newValue);
    }
}

function getAmountOfTranslatedPages(doc, pageId, languageName) {
    const pages = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    let amount = 0;
    if (!!pages) {
        amount = pages
            .split(',')
            .map(p => {
                const parts = p.split('=>');
                return {
                    sourceId: parts[0],
                    translatedId: parts[1]
                }
            })
            .filter(e => e.sourceId === pageId).length;
    }
    return amount;
}

function syncStorage(doc, sourceElementId, languageName) {
    const pages = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    const translatedPages = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    const deletedTranslatedPageIds = [];
    if (!!pages) {
        const updatedArr = pages
            .split(',')
            .map(p => {
                const parts = p.split('=>');
                return {
                    sourceId: parts[0],
                    translatedId: parts[1]
                }
            })
            .filter(foundRecord => {
                if (foundRecord.sourceId === sourceElementId) {
                    const exists = !!doc.pages.find(p => p.id === foundRecord.translatedId);
                    if (!exists) {
                        deletedTranslatedPageIds.push(foundRecord.translatedId);
                    }
                    return exists;
                }
                return true;
            })
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-pages`, updatedArr);
        if (!!translatedPages) {
            const translatedPagesNew = translatedPages.split(',').filter(p => !deletedTranslatedPageIds.includes(p)).join(',');
            settings.setDocumentSettingForKey(doc, `crowdin-translated-pages`, translatedPagesNew);
        }
    }
}

function addTranslatedPage(doc, sourceElementId, translatedId, languageName) {
    //remove translated pages which were deleted manually by user
    syncStorage(doc, sourceElementId, languageName);
    let elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-pages`);
    let translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    if (!elements) {
        elements = `${sourceElementId}=>${translatedId}`;
        translatedElements = translatedId;
    } else {
        elements += `,${sourceElementId}=>${translatedId}`;
        translatedElements += `,${translatedId}`;
    }
    settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-pages`, elements);
    settings.setDocumentSettingForKey(doc, `crowdin-translated-pages`, translatedElements);
}

function getListOfTranslatedPages(doc) {
    const translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-pages`);
    if (!translatedElements) {
        return [];
    }
    return translatedElements.split(',');
}

function getTags(doc) {
    const json = settings.documentSettingForKey(doc, 'crowdin-tags');
    if (!json) {
        return [];
    }
    return JSON.parse(json);
}

function saveTags(doc, tags) {
    settings.setDocumentSettingForKey(doc, 'crowdin-tags', JSON.stringify(tags || []));
}

export {
    removeTranslatedPages,
    getAmountOfTranslatedPages,
    addTranslatedPage,
    getListOfTranslatedPages,
    getTags,
    saveTags
};