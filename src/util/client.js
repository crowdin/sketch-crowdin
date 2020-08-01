import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID } from '../constants';
import { handleError, createClient } from './http';

async function getProjects() {
    try {
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        ui.message('Loading projects');
        const { projectsGroupsApi } = createClient();
        const projects = await projectsGroupsApi.withFetchAll().listProjects();
        if (projects.data.length === 0) {
            throw 'Currently there is not projects to select';
        }
        let projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!!projectId) {
            projectId = parseInt(projectId);
        }
        return {
            selectedProjectId: projectId,
            projects: projects.data.map(p => {
                return {
                    id: p.data.id,
                    name: p.data.name
                };
            })
        }
    } catch (error) {
        handleError(error);
        return {
            projects: []
        };
    }
}

async function getLanguages() {
    try {
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw 'Please select a project';
        }
        ui.message('Loading list of languages');
        const { projectsGroupsApi, languagesApi } = createClient();
        const languages = await languagesApi.withFetchAll().listSupportedLanguages();
        const project = await projectsGroupsApi.getProject(projectId);
        return languages.data
            .filter(l => project.data.targetLanguageIds.includes(l.data.id))
            .map(l => {
                return {
                    id: l.data.id,
                    name: l.data.name
                };
            });
    } catch (error) {
        handleError(error);
        return [];
    }
}

async function getFiles() {
    try {
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw 'Please select a project';
        }
        ui.message('Loading list of files');
        const { sourceFilesApi } = createClient();
        const files = await sourceFilesApi.withFetchAll().listProjectFiles(projectId);
        return files.data.map(e => {
            return {
                id: e.data.id,
                name: e.data.name,
                type: e.data.type
            };
        });
    } catch (error) {
        handleError(error);
        return [];
    }
}

async function getStrings() {
    try {
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw 'Please select a project';
        }
        ui.message('Loading strings');
        const strings = await fetchStrings(projectId, createClient().sourceStringsApi);
        if (strings.length === 0) {
            throw 'There are no strings in Crowdin yet';
        }
        return strings;
    } catch (error) {
        handleError(error);
        return [];
    }
}

async function fetchStrings(projectId, sourceStringsApi) {
    const res = await sourceStringsApi.withFetchAll().listProjectStrings(projectId);
    return convertCrowdinStringsToStrings(res.data);
}

function convertCrowdinStringsToStrings(crowdinStrings) {
    return crowdinStrings
        .map(str => str.data)
        .map(e => {
            let text = e.text;
            if (text && typeof text !== 'string') {
                text = text.one ||
                    text.zero ||
                    text.two ||
                    text.few ||
                    text.many ||
                    text.other || '';
            }
            return {
                text, id: e.id
            }
        })
        .filter(e => e.text && e.text.length > 0);
}

export { getProjects, getLanguages, getFiles, getStrings, fetchStrings };