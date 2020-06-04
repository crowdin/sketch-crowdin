import settings from 'sketch/settings';
import dom from 'sketch/dom';

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

export { removeTranslatedElement, addTranslatedElement, getListOfTranslatedElements };