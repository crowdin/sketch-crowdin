import ui from 'sketch/ui';
import settings from 'sketch/settings';
import dom from 'sketch/dom';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import * as httpUtil from '../util/http';
import { default as displayTexts } from '../../assets/texts.json';
import { truncateLongText } from '../util/string';
import * as localStorage from '../util/local-storage';
import { updateText } from '../util/dom';

async function addString(req) {
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        const res = await sourceStringsApi.addString(projectId, req);
        ui.message(displayTexts.notifications.info.stringAdded.replace('%name%', truncateLongText(req.text)));
        return { id: res.data.id };
    };
    return await executeOperartion(callback);
}

async function editString(string) {
    const { id, text, context, maxLength, identifier } = string;
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        const string = await sourceStringsApi.editString(projectId, id, [
            {
                path: '/text',
                value: text,
                op: 'replace'
            },
            {
                path: '/context',
                value: context,
                op: 'replace'
            },
            {
                path: '/maxLength',
                value: maxLength,
                op: 'replace'
            },
            {
                path: '/identifier',
                value: identifier,
                op: 'replace'
            }
        ]);
        const tags = localStorage.getTags(dom.getSelectedDocument());
        const stringTags = tags.filter(t => t.stringId === id);
        stringTags.forEach(tag => updateText(tag, text, !!string.data.identifier ? string.data.identifier : text));
    };
    return await executeOperartion(callback);
}

async function deleteString(req) {
    const stringId = req.id;
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        await sourceStringsApi.deleteString(projectId, stringId);
    };
    return await executeOperartion(callback);
}

async function executeOperartion(operation) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw displayTexts.notifications.warning.noAccessToken;
        }
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }

        const res = await operation(projectId);
        return {
            error: false,
            data: res
        };
    } catch (error) {
        httpUtil.handleError(error);
        return { error: true };
    }

}

export { addString, editString, deleteString };