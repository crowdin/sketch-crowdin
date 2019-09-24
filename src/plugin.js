import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import * as crowdin from 'crowdin-sdk-2';
import { ACCESS_TOKEN_KEY, ORGANIZATION, PROJECT_ID } from './constants';

function sendPageStringsToCrowdin() {
    const selectedDocument = dom.getSelectedDocument();
    const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
    const accessToken = settings.settingForKey(ACCESS_TOKEN_KEY);
    const projectId = settings.settingForKey(PROJECT_ID);
    const organization = settings.settingForKey(ORGANIZATION);

    if (!selectedDocument) {
        return ui.message('Please select a document');
    }
    if (!selectedPage) {
        return ui.message('Please select a page');
    }
    if (!accessToken || !projectId) {
        return ui.message('Please configure plugin in plugin Configuration menu');
    }

    const strings = dom.find('Text', selectedPage);

    if (strings.length === 0) {
        return ui.message('Nothing to send to Crowdin system');
    }

    const text = strings.map(t => t.text).join('\n\r');

    ui.message(text);

    /**
     * load project files, check if file for page already exists (file name => Sketch/pageId)
     * if file found, update it
     * else upload new file
     */

    // const api = new crowdin.ProjectsGroups.Api({
    //     token: settings.settingForKey(ACCESS_TOKEN_KEY),
    //     organization: settings.settingForKey(ORGANIZATION)
    // }, {
    //     httpClient: crowdin.HttpClientType.FETCH
    // });
    // api.listProjects()
    //     .then(resp => ui.message(`Found ${JSON.stringify(resp)} projects`))
    //     .catch(_error => ui.message('Failed to fetch projects' + JSON.stringify(_error)));
}

export { sendPageStringsToCrowdin };