import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID } from '../constants';
import { handleError, createClient } from './http';
import { default as displayTexts } from '../../assets/texts.json';

async function getProjects() {
    try {
        if (!dom.getSelectedDocument()) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        ui.message(displayTexts.notifications.info.loadingProjects);
        const { projectsGroupsApi } = createClient();
        const projects = await projectsGroupsApi.withFetchAll().listProjects();
        if (projects.data.length === 0) {
            throw displayTexts.notifications.warning.noProjects;
        }
        let projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!!projectId) {
            projectId = parseInt(projectId);
        } else {
            projectId = projects.data.length > 0 ? projects.data[0].data.id : null;
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
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingLanguages);
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
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingFiles);
        const { sourceFilesApi } = createClient();
        const files = await sourceFilesApi.withFetchAll().listProjectFiles(projectId);
        return files.data.map(e => {
            return {
                id: e.data.id,
                name: e.data.path,
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
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingStrings);
        const strings = await fetchStrings(projectId, createClient().sourceStringsApi);
        if (strings.length === 0) {
            throw displayTexts.notifications.warning.noStrings;
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
                text, id: e.id, fileId: e.fileId
            }
        })
        .filter(e => e.text && e.text.length > 0);
}

export { getProjects, getLanguages, getFiles, getStrings, fetchStrings };