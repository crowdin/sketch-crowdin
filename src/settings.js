import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, ORGANIZATION } from './constants';
import { handleError, createClient } from './util';

function setAccessToken() {
    return ui.getInputFromUser('Personal Access Token', (err, value) => {
        if (err) {
            return;
        }
        settings.setSettingForKey(ACCESS_TOKEN_KEY, value);
    });
}

function setProjectId() {
    if (!dom.getSelectedDocument()) {
        return ui.message('Please select a document');
    }
    return ui.getInputFromUser('Project identifier',
        {
            initialValue: settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID)
        },
        (err, value) => {
            if (err) {
                return;
            }
            settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, value);
        });
}

function setOrganization() {
    return ui.getInputFromUser('Organization',
        {
            initialValue: settings.settingForKey(ORGANIZATION)
        },
        (err, value) => {
            if (err) {
                return;
            }
            settings.setSettingForKey(ORGANIZATION, value);
        });
}

async function setProjectIdFromExisting() {
    try {
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        const { projectsGroupsApi } = createClient();
        const projects = await projectsGroupsApi.listProjects(undefined, undefined, 500);
        if (projects.data.length === 0) {
            throw 'Currently there is not projects to select';
        }
        ui.getInputFromUser('Projects', {
            type: ui.INPUT_TYPE.selection,
            possibleValues: projects.data.map(pr => pr.data.name)
        }, (err, value) => {
            if (err) {
                return;
            }
            const selectedProject = projects.data.find(pr => pr.data.name === value);
            if (!!selectedProject) {
                settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, selectedProject.data.id);
            }
        })
    } catch (error) {
        handleError(error);
    }
}

export { setAccessToken, setProjectId, setOrganization, setProjectIdFromExisting };
