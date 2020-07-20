import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import * as httpUtil from '../util/http';
import { PatchOperation } from '@crowdin/crowdin-api-client';

async function addString(req) {
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        const res = await sourceStringsApi.addString(projectId, req);
        return { id: res.data.id };
    };
    await executeOperartion(callback);
}

async function editString(string) {
    const { id, text } = string;
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        await sourceStringsApi.editString(projectId, id, [{
            path: '/text',
            value: text,
            op: PatchOperation.REPLACE
        }]);
    };
    await executeOperartion(callback);
}

async function deleteString(stringId) {
    const callback = async (projectId) => {
        const { sourceStringsApi } = httpUtil.createClient();
        await sourceStringsApi.deleteString(projectId, stringId);
    };
    await executeOperartion(callback);
}

async function executeOperartion(operation) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw 'Please select a document';
        }
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw 'Please specify correct access token';
        }
        if (!projectId) {
            throw 'Please select a project';
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