import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, TEXT_TYPE } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';

async function useString(string) {
    try {
        if (!string || !string.id || !string.text) {
            throw 'Please select a string';
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw 'Please select a document';
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedPage) {
            throw 'Please select a page';
        }
        const selectedText = domUtil.getSelectedText(selectedPage);
        if (!selectedText) {
            throw 'Please select a text element';
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw 'Please specify correct access token';
        }
        if (!projectId) {
            throw 'Please select a project';
        }

        const id = string.id;
        const text = string.text;

        if (selectedText.type === TEXT_TYPE) {
            selectedText.element.text = text;
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

export { useString };
