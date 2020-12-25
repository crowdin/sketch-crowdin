import ui from 'sketch/ui';
import settings from 'sketch/settings';
import crowdin, { HttpClientType } from '@crowdin/crowdin-api-client';
import { ACCESS_TOKEN_KEY, ORGANIZATION, PLUGIN_VERSION } from '../constants';
import { default as displayTexts } from '../../assets/texts.json';
import { truncateLongText } from './string';

function createClient() {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    const organization = settings.settingForKey(ORGANIZATION);
    const sketchVersion = NSBundle.mainBundle().infoDictionary()['CFBundleShortVersionString'];
    if (!token) {
        throw displayTexts.notifications.warning.noAccessToken;
    }
    return new crowdin(
        {
            token,
            organization
        },
        {
            httpClientType: HttpClientType.FETCH,
            userAgent: `crowdin-sketch-plugin/${PLUGIN_VERSION} sketch/${sketchVersion}`
        }
    );
}

function handleError(error) {
    if (typeof error === 'string' || error instanceof String) {
        return ui.message(error);
    } else {
        if (error.error) {
            const httpError = error.error;
            if (httpError.code && httpError.code === 403) {
                return ui.message(displayTexts.notifications.warning.authorizationError);
            } else if (httpError.code && httpError.code === 401) {
                return ui.message(displayTexts.notifications.warning.authenticationError);
            } else if (httpError.message) {
                return ui.message(httpError.message);
            }
        }
        return ui.message(displayTexts.notifications.warning.serverError.replace('%error%', truncateLongText(JSON.stringify(error))));
    }
}

export { createClient, handleError };