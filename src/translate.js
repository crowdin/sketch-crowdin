import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as crowdin from 'crowdin-sdk-2';
import * as util from './util.js';

function translate() {
    if (!util.isPluginConfigured()) {
        ui.message('Plugin is not fully configured!');
        return;
    }
    const api = new crowdin.ProjectsGroups.Api({
        token: '',
        organization: 'oliynyk'
    });
    api.listProjects()
        .then(resp => {
            console.log(JSON.stringify(resp));
            ui.message('Translated!');
        })
        .catch(error => console.log(JSON.stringify(error)))
        .finally(() => ui.message('Translated!'));
}

export { translate };