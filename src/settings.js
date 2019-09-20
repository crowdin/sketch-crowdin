import ui from 'sketch/ui';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID } from './constants';

function setAccessToken() {
    ui.getInputFromUser('Personal Access Token', (err, value) => {
        if (err) {
            return;
        }
        settings.setSettingForKey(ACCESS_TOKEN_KEY, value);
    });
    return;
}

function setProjectId() {
    ui.getInputFromUser('Project identifier',
        {
            initialValue: settings.settingForKey(PROJECT_ID)
        },
        (err, value) => {
            if (err) {
                return;
            }
            settings.setSettingForKey(PROJECT_ID, value);
        });
    return;
}

export { setAccessToken, setProjectId };
