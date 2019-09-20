import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID } from './constants';

function isPluginConfigured() {
    return !!settings.settingForKey(ACCESS_TOKEN_KEY)
        && !!settings.settingForKey(PROJECT_ID);
}

export { isPluginConfigured };