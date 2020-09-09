import settings from 'sketch/settings';
import dom from 'sketch/dom';
import { OVERRIDE_TRANSLATIONS } from '../constants';

function removeTranslatedElements(doc, sourceElementId, languageName, type) {
    const remove = !!settings.documentSettingForKey(doc, OVERRIDE_TRANSLATIONS);
    if (!remove) {
        return;
    }
    const elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-${type}s`);
    const translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-${type}s`);
    const deletedTranslatedElementIds = [];
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
        arr
            .filter(p => p.sourceId === sourceElementId)
            .forEach(foundRecord => {
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
                deletedTranslatedElementIds.push(foundRecord.translatedId);
                if (!!elementToRemove) {
                    elementToRemove.remove();
                }
            });
        if (!!translatedElements) {
            const translatedElementsNew = translatedElements.split(',').filter(p => !deletedTranslatedElementIds.includes(p)).join(',');
            settings.setDocumentSettingForKey(doc, `crowdin-translated-${type}s`, translatedElementsNew);
        }
        const newValue = arr
            .filter(p => p.sourceId !== sourceElementId)
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-${type}s`, newValue);
    }
}

function getAmountOfTranslatedElements(doc, sourceElementId, languageName, type) {
    syncStorage(doc, sourceElementId, languageName, type);
    const elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-${type}s`);
    let amount = 0;
    if (!!elements) {
        amount = elements
            .split(',')
            .map(p => {
                const parts = p.split('=>');
                return {
                    sourceId: parts[0],
                    translatedId: parts[1]
                }
            })
            .filter(e => e.sourceId === sourceElementId).length;
    }
    return amount;
}

function syncStorage(doc, sourceElementId, languageName, type) {
    const elements = settings.documentSettingForKey(doc, `crowdin-${languageName}-${type}s`);
    const translatedElements = settings.documentSettingForKey(doc, `crowdin-translated-${type}s`);
    const deletedTranslatedElementIds = [];
    if (!!elements) {
        const updatedArr = elements
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
                    if (type === 'page') {
                        const exists = !!doc.pages.find(p => p.id === foundRecord.translatedId);
                        if (!exists) {
                            deletedTranslatedElementIds.push(foundRecord.translatedId);
                        }
                        return exists;
                    } else if (type === 'artboard') {
                        for (let i = 0; i < doc.pages.length; i++) {
                            const page = doc.pages[i];
                            const artboards = dom.find('Artboard', page);
                            for (let j = 0; j < artboards.length; j++) {
                                if (artboards[j].id === foundRecord.translatedId) {
                                    return true;
                                }
                            }
                        }
                        deletedTranslatedElementIds.push(foundRecord.translatedId);
                        return false;
                    }
                }
                return true;
            })
            .map(p => `${p.sourceId}=>${p.translatedId}`)
            .join(',');
        settings.setDocumentSettingForKey(doc, `crowdin-${languageName}-${type}s`, updatedArr);
        if (!!translatedElements) {
            const translatedElementsNew = translatedElements.split(',').filter(p => !deletedTranslatedElementIds.includes(p)).join(',');
            settings.setDocumentSettingForKey(doc, `crowdin-translated-${type}s`, translatedElementsNew);
        }
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

export { removeTranslatedElements, getAmountOfTranslatedElements, addTranslatedElement, getListOfTranslatedElements, getTags, saveTags };