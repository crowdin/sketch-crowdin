import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as crowdin from 'crowdin-sdk-2';
import { ACCESS_TOKEN_KEY, ORGANIZATION } from './constants';

function createClient() {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    const organization = settings.settingForKey(ORGANIZATION);
    if (!token) {
        throw 'Please set access token';
    }
    return new crowdin.Client({ token, organization }, { httpClientType: crowdin.HttpClientType.FETCH });
}

function handleError(error) {
    if (typeof error === 'string' || error instanceof String) {
        ui.message(error);
    } else {
        ui.message(`An error occurred ${JSON.stringify(error)}`);
    }
}

export { createClient, handleError };