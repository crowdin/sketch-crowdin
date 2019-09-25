import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import * as crowdin from 'crowdin-sdk-2';
import { ACCESS_TOKEN_KEY, ORGANIZATION, PROJECT_ID } from './constants';

async function sendPageStringsToCrowdin() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const token = settings.settingForKey(ACCESS_TOKEN_KEY);
        const projectId = settings.settingForKey(PROJECT_ID);
        const organization = settings.settingForKey(ORGANIZATION);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (!token || !projectId) {
            throw 'Please configure plugin in plugin Configuration menu';
        }

        const strings = dom.find('Text', selectedPage);

        if (strings.length === 0) {
            throw 'Nothing to send to Crowdin system';
        }

        const text = strings.map(t => t.text).join('\n\r');

        const client = new crowdin.Client({ token, organization }, { httpClientType: crowdin.HttpClientType.FETCH });
        const { sourceFilesApi, uploadStorageApi } = client;

        //add proper pagination here
        const fileName = `Sketch_${selectedPage.id}`;
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
        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        if (typeof error === 'string' || error instanceof String) {
            ui.message(error);
        } else {
            ui.message(`An error occurred ${JSON.stringify(error)}`);
        }
    }
}

export { sendPageStringsToCrowdin };