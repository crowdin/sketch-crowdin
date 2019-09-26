import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID } from './constants';
import { createClient, handleError } from './util';

async function sendDocumentStringsToCrowdin() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const projectId = settings.settingForKey(PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!projectId) {
            throw 'Please set project id';
        }

        if (selectedDocument.pages === 0) {
            throw 'Nothing to send to Crowdin system';
        }

        //just for validation
        createClient();

        const promises = selectedDocument.pages.map(page => sendPageStrings(page));
        try {
            await Promise.all(promises);
            ui.message('Strings were successfully pushed to Crowdin');
        } catch (error) {
            ui.message('Processed with errors');
        }
    } catch (error) {
        handleError(error);
    }
}

async function sendPageStringsToCrowdin() {
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
        if (!projectId) {
            throw 'Please set project id';
        }

        await sendPageStrings(selectedPage);
        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        handleError(error);
    }
}

async function sendPageStrings(page) {
    const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);

    const strings = dom.find('Text', page);

    if (strings.length === 0) {
        throw 'Nothing to send to Crowdin system';
    }

    const text = strings.map(t => t.text).join('\n\r');

    const { sourceFilesApi, uploadStorageApi } = createClient();

    //add proper pagination here
    const fileName = `Sketch_${page.id}`;
    const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage('text/plain', text);
    const storageId = storage.data.id;
    if (!!file) {
        await sourceFilesApi.updateFile(projectId, file.id, { storageId });
    } else {
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName
        });
    }
}

export { sendPageStringsToCrowdin, sendDocumentStringsToCrowdin };