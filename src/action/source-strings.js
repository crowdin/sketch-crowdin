import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, TEXT_TYPE } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { default as displayTexts } from '../../assets/texts.json';

async function useString(string) {
    try {
        if (!string || !string.id || !string.text || !string.identifier) {
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
        const selectedText = domUtil.getSelectedText(selectedPage);
        if (!selectedText) {
            throw displayTexts.notifications.warning.selectTextElement;
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw displayTexts.notifications.warning.noAccessToken;
        }
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }

        const id = string.id;
        const text = string.text;

        if (selectedText.type === TEXT_TYPE) {
            selectedText.element.text = text;
            selectedText.element.name = string.identifier;
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
            tags[tagIndex] = tag;
        }
        localStorage.saveTags(selectedDocument, tags);
    } catch (error) {
        httpUtil.handleError(error);
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

    const selectedText = domUtil.getSelectedText(selectedPage);
    if (!selectedText) {
        return {};
    }

    const text = selectedText.type === TEXT_TYPE ? selectedText.element.text : selectedText.element.value;
    const elementName = selectedText.type === TEXT_TYPE ? selectedText.element.name : selectedText.element.affectedLayer.name;
    const artboardName = !!selectedText.artboard ? selectedText.artboard.name : '';
    const groupName = !!selectedText.group ? selectedText.group.name : '';

    return { text, artboard: artboardName, group: groupName, elementName };
}

export { useString, getSelectedText };
