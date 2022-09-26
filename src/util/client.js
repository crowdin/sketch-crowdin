import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, BRANCH_ID } from '../constants';
import { handleError, createClient } from './http';
import { default as displayTexts } from '../../assets/texts.json';

async function getProjects() {
    try {
        if (!dom.getSelectedDocument()) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        ui.message(displayTexts.notifications.info.loadingProjects);
        const { projectsGroupsApi } = createClient();
        const projects = await projectsGroupsApi.withFetchAll().listProjects(undefined, true);
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

async function getSourceLanguage() {
    try {
        if (!dom.getSelectedDocument()) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingSourceLanguage);
        const { languagesApi, projectsGroupsApi } = createClient();
        const project = await projectsGroupsApi.getProject(projectId);
        const sourceLanguage = await languagesApi.getLanguage(project.data.sourceLanguageId);
        return {
            sourceLanguage: sourceLanguage.data
        }
    } catch (error) {
        handleError(error);
        return {
            sourceLanguage: null
        };
    }
}

async function getBranches() {
    try {
        if (!dom.getSelectedDocument()) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingBranches);
        const { sourceFilesApi } = createClient();
        const branches = await sourceFilesApi.withFetchAll().listProjectBranches(projectId);
        let branchId = settings.documentSettingForKey(dom.getSelectedDocument(), BRANCH_ID);
        if (!branchId || !branches.data.map(b => b.data.id).includes(branchId)) {
            branchId = -1;
        }
        return {
            selectedBranchId: branchId,
            branches: branches.data.map(p => {
                return {
                    id: p.data.id,
                    name: p.data.name
                };
            })
        }
    } catch (error) {
        handleError(error);
        return {
            selectedBranchId: -1,
            branches: []
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
        let branchId = settings.documentSettingForKey(dom.getSelectedDocument(), BRANCH_ID);
        branchId = !!branchId && branchId > 0 ? branchId : undefined;
        ui.message(displayTexts.notifications.info.loadingFiles);
        const { sourceFilesApi } = createClient();
        const files = await sourceFilesApi.withFetchAll().listProjectFiles(projectId, branchId, undefined, undefined, undefined, true);
        return files.data
            .map(e => e.data)
            .sort(sortFiles)
            .map(e => {
                return {
                    id: e.id,
                    name: e.path,
                    type: e.type
                };
            });
    } catch (error) {
        handleError(error);
        return [];
    }
}

function sortFiles(file1, file2) {
    if (file1.branchId && !file2.branchId) {
        return -1;
    } else if (!file1.branchId && file2.branchId) {
        return 1;
    } else if (file1.branchId !== file2.branchId) {
        const branch1 = file1.path.split('/')[1];
        const branch2 = file2.path.split('/')[1];
        return branch1.localeCompare(branch2);
    } else {
        const path1 = file1.path.split('/');
        path1.shift();
        const path2 = file2.path.split('/');
        path2.shift();
        for (let i = 0; ; i++) {
            if (path1.length === i && path2.length > i) {
                return 1;
            } else if (path1.length > i && path2.length === i) {
                return -1;
            } else {
                const isLast1 = path1.length === i + 1;
                const isLast2 = path2.length === i + 1;
                if (path1[i] !== path2[i]) {
                    if (!isLast1 && isLast2) {
                        return -1;
                    } else if (isLast1 && !isLast2) {
                        return 1;
                    } else {
                        if (path1[i] > path2[i]) {
                            return 1;
                        } else if (path1[i] < path2[i]) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                } else {
                    if (!isLast1 && isLast2) {
                        return -1;
                    } else if (isLast1 && !isLast2) {
                        return 1;
                    }
                }
            }
        }
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
        const strings = await fetchStrings(projectId);
        if (strings.length === 0) {
            throw displayTexts.notifications.warning.noStrings;
        }
        return strings;
    } catch (error) {
        handleError(error);
        return [];
    }
}

async function fetchStrings(projectId) {
    const { sourceStringsApi } = createClient();
    let branchId = settings.documentSettingForKey(dom.getSelectedDocument(), BRANCH_ID);
    branchId = !!branchId && branchId > 0 ? branchId : undefined;
    const res = await sourceStringsApi.withFetchAll().listProjectStrings(projectId, { branchId });
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
                text,
                id: e.id,
                fileId: e.fileId,
                identifier: e.identifier,
                context: e.context,
                branchId: e.branchId,
                labelIds: e.labelIds,
                maxLength: e.maxLength,
            };
        })
        .filter(e => e.text && e.text.length > 0);
}

async function getLabels() {
    try {
        if (!dom.getSelectedDocument()) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        ui.message(displayTexts.notifications.info.loadingLabels);
        const { labelsApi } = createClient();
        const languages = await labelsApi.withFetchAll().listLabels(projectId);
        return languages.data
            .map(l => {
                return {
                    id: l.data.id,
                    title: l.data.title
                };
            });
    } catch (error) {
        handleError(error);
        return [];
    }
}

export { getProjects, getBranches, getLanguages, getFiles, getStrings, fetchStrings, getLabels, getSourceLanguage };