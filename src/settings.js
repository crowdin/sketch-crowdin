import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, ORGANIZATION } from './constants';
import { handleError, createClient } from './util';

async function connectToCrowdin() {
    await setOrganization();
    await setAccessToken();
}

function setAccessToken() {
    return new Promise((res, _rej) => {
        ui.getInputFromUser('Personal Access Token',
            {
                initValue: settings.settingForKey(ACCESS_TOKEN_KEY)
            },
            (err, value) => {
                if (err) {
                    return res();
                }
                settings.setSettingForKey(ACCESS_TOKEN_KEY, value);
                res();
            });
    });
}

function setOrganization() {
    return new Promise((res, _rej) => {
        ui.getInputFromUser('Organization',
            {
                initialValue: settings.settingForKey(ORGANIZATION)
            },
            (err, value) => {
                if (err) {
                    return res();
                }
                settings.setSettingForKey(ORGANIZATION, value);
                res();
            });
    });
}

async function setProjectIdFromExisting() {
    try {
        if (!settings.settingForKey(ORGANIZATION) || !settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
        }
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        ui.message('Loading projects');
        const { projectsGroupsApi } = createClient();
        const projects = await projectsGroupsApi.listProjects(undefined, undefined, 500);
        if (projects.data.length === 0) {
            throw 'Currently there is not projects to select';
        }
        let projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        let initValue = `${projects.data[0].data.name} [${projects.data[0].data.id}]`;
        if (!!projectId) {
            projectId = parseInt(projectId);
            const selectedPr = projects.data.find(pr => pr.data.id === projectId);
            if (!!selectedPr) {
                initValue = `${selectedPr.data.name} [${selectedPr.data.id}]`;
            }
        }
        ui.getInputFromUser('Projects', {
            type: ui.INPUT_TYPE.selection,
            possibleValues: projects.data.map(pr => `${pr.data.name} [${pr.data.id}]`),
            initialValue: initValue
        }, (err, value) => {
            if (err) {
                return;
            }
            const parts = value.split('[');
            const part = parts[parts.length - 1];
            const id = parseInt(part.substring(0, part.length - 1));
            settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, id);
        });
    } catch (error) {
        handleError(error);
    }
}

function test() {
    settings.setSettingForKey(ACCESS_TOKEN_KEY, undefined);
    settings.setSettingForKey(ORGANIZATION, undefined);
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, undefined);
}

export { connectToCrowdin, setProjectIdFromExisting, test };
