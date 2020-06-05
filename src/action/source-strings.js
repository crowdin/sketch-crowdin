import dom from 'sketch/dom';
import settings from 'sketch/settings';
import ui from 'sketch/ui';
import { ACCESS_TOKEN_KEY, PROJECT_ID, TEXT_TYPE } from '../constants';
import { connectToCrowdin, setProjectIdFromExisting } from '../settings';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { fetchAllStrings } from '../util/client';

async function crowdinStrings() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        const selectedText = domUtil.getSelectedText(selectedPage);
        if (!selectedText) {
            throw 'Please select a text element';
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
            return;
        }
        if (!projectId) {
            await setProjectIdFromExisting();
            return;
        }

        const { sourceStringsApi } = httpUtil.createClient();
        ui.message('Loading strings');
        let strings = await fetchAllStrings(projectId, sourceStringsApi);
        ui.message(`Loaded ${strings.length} strings`);

        if (strings.length === 0) {
            return ui.message('There are no strings in Crowdin yet');
        }

        ui.getInputFromUser('Select text', {
            type: ui.INPUT_TYPE.selection,
            possibleValues: strings.map(st => `${st.text} [${st.id}]`)
        }, (err, value) => {
            if (err) {
                return;
            }
            const parts = value.split('[');
            const part = parts[parts.length - 1];
            const id = parseInt(part.substring(0, part.length - 1));
            const text = strings.find(st => st.id === id).text;

            if (selectedText.type === TEXT_TYPE) {
                selectedText.element.text = text;
            } else {
                selectedText.element.value = text;
            }

            const artboard = selectedText.artboard;
            if (!!artboard) {
                const tags = localStorage.getTags(selectedDocument);
                const tagIndex = tags.findIndex(t =>
                    t.id === selectedText.id
                    && t.type === selectedText.type
                    && t.artboardId === artboard.id
                    && t.pageId === selectedPage.id
                );
                const tag = {
                    id: selectedText.id,
                    type: selectedText.type,
                    artboardId: artboard.id,
                    pageId: selectedPage.id,
                    stringId: id
                };
                if (tagIndex < 0) {
                    tags.push(tag);
                } else {
                    tags[tagIndex] = tag;
                }
                localStorage.saveTags(selectedDocument, tags);
            }
        });
    } catch (error) {
        httpUtil.handleError(error);
    }
}

export { crowdinStrings };
