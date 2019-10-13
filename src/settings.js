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

export { setAccessToken, setProjectId, setOrganization, setProjectIdFromExisting };
