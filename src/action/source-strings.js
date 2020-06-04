import dom from 'sketch/dom';
import settings from 'sketch/settings';
import ui from 'sketch/ui';
import { ACCESS_TOKEN_KEY, PROJECT_ID } from '../constants';
import { connectToCrowdin, setProjectIdFromExisting } from '../settings';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
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
        const selectedSymbolText = domUtil.getSelectedSymbolText(selectedPage);
        if (!selectedText && !selectedSymbolText) {
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
        strings = strings.map(s => s.text);

        if (strings.length === 0) {
            return ui.message('There are no strings in Crowdin yet');
        }

        ui.getInputFromUser('Select text', {
            type: ui.INPUT_TYPE.selection,
            possibleValues: strings
        }, (err, value) => {
            if (err) {
                return;
            }
            if (selectedText) {
                selectedText.text = value;
            } else {
                selectedSymbolText.value = value;
            }
            //TODO store used string and text in local storage and use it in upload screenshots action
        });
    } catch (error) {
        httpUtil.handleError(error);
    }
}

export { crowdinStrings };
