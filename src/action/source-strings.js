import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, TEXT_TYPE } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { default as displayTexts } from '../../assets/texts.json';

function useString(strings) {
    try {
        if (strings.length === 0) {
            throw displayTexts.notifications.warning.selectString;
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedPage) {
            throw displayTexts.notifications.warning.selectPage;
        }
        const selectedTexts = domUtil.getSelectedText(selectedPage);
        if (selectedTexts.length === 0) {
            throw displayTexts.notifications.warning.selectTextElement;
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw displayTexts.notifications.warning.noAccessToken;
        }
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }

        const stringsToDeselect = [];

        strings.forEach(string => {
            const selectedText = !!string.selectedText
                ? selectedTexts.find(st => {
                    if (!!string.selectedText.artboardId) {
                        return !!st.artboard
                            && st.artboard.id === string.selectedText.artboardId
                            && st.element.id === string.selectedText.elementId
                            && st.type === string.selectedText.type;
                    } else {
                        return !st.artboard
                            && st.element.id === string.selectedText.elementId
                            && st.type === string.selectedText.type;
                    }
                })
                : selectedTexts[0];
            if (!selectedText) {
                return;
            }

            const id = string.id;
            const text = string.text;

            if (selectedText.type === TEXT_TYPE) {
                selectedText.element.text = text;
                selectedText.element.name = !!string.identifier ? string.identifier : text;
            } else {
                selectedText.element.value = text;
            }

            const artboard = selectedText.artboard;
            const tags = localStorage.getTags(selectedDocument);
            const tagIndex = tags.findIndex(t =>
                t.id === selectedText.id
                && t.type === selectedText.type
                && t.pageId === selectedPage.id
            );
            const tag = {
                id: selectedText.id,
                type: selectedText.type,
                artboardId: !!artboard ? artboard.id : undefined,
                pageId: selectedPage.id,
                stringId: id
            };
            if (tagIndex < 0) {
                tags.push(tag);
            } else {
                if (tags.filter(t => t.stringId === tags[tagIndex].stringId).length === 1) {
                    //we are replacing single usage of the string
                    stringsToDeselect.push(tags[tagIndex].stringId);
                }
                tags[tagIndex] = tag;
            }
            localStorage.saveTags(selectedDocument, tags);
        });
        return {
            error: false,
            stringsToDeselect
        };
    } catch (error) {
        httpUtil.handleError(error);
        return {
            error: true
        };
    }
}

function deselectString(id) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const tags = localStorage.getTags(selectedDocument).filter(t => t.stringId !== id);
        localStorage.saveTags(selectedDocument, tags);
        return {
            error: false
        };
    } catch (error) {
        httpUtil.handleError(error);
        return {
            error: true
        };
    }
}

function getSelectedText() {
    const selectedDocument = dom.getSelectedDocument();
    if (!selectedDocument) {
        return {};
    }

    const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
    if (!selectedPage) {
        return {};
    }

    const selectedTexts = domUtil.getSelectedText(selectedPage);
    return selectedTexts.map(selectedText => {
        const text = selectedText.type === TEXT_TYPE ? selectedText.element.text : selectedText.element.value;
        const elementName = selectedText.type === TEXT_TYPE ? selectedText.element.name : selectedText.element.affectedLayer.name;
        const artboardName = !!selectedText.artboard ? selectedText.artboard.name : '';
        const artboardId = !!selectedText.artboard ? selectedText.artboard.id : undefined;
        const groupName = !!selectedText.group ? selectedText.group.name : '';

        return {
            text,
            artboard: artboardName,
            group: groupName,
            elementName,
            artboardId,
            type: selectedText.type,
            elementId: selectedText.element.id
        };
    });
}

function getUsedStrings() {
    const selectedDocument = dom.getSelectedDocument();
    if (!selectedDocument) {
        throw displayTexts.notifications.warning.selectDocument;
    }
    const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;

    if (!selectedPage) {
        throw displayTexts.notifications.warning.selectPage;
    }
    return localStorage.getTags(selectedDocument)
        .filter(t => t.pageId === selectedPage.id)
        .map(t => t.stringId);
}

export { useString, getSelectedText, getUsedStrings, deselectString };
