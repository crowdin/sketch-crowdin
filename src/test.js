import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as crowdin from 'crowdin-sdk-2';
import { ACCESS_TOKEN_KEY, ORGANIZATION } from './constants';

function test() {
    if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
        ui.message('Please set access token in plugin Configuration menu');
        return;
    }
    const api = new crowdin.ProjectsGroups.Api({
        token: settings.settingForKey(ACCESS_TOKEN_KEY),
        organization: settings.settingForKey(ORGANIZATION)
    }, {
        httpClient: crowdin.HttpClientType.FETCH
    });
    api.listProjects()
        .then(resp => ui.message(`Found ${JSON.stringify(resp)} projects`))
        .catch(_error => ui.message('Failed to fetch projects' + JSON.stringify(_error)));
}

export { test };