import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { ACCESS_TOKEN_KEY, PROJECT_ID, ORGANIZATION } from './constants';
import { handleError, createClient } from './util';

async function connectToCrowdin() {
    await setOrganization();
    await setAccessToken();
}

function setAccessToken() {
    return new Promise((res, _rej) => {
        const token = settings.settingForKey(ACCESS_TOKEN_KEY);
        let initValue = undefined;
        if (!!token && token.length > 3) {
            initValue = token.substring(0, 3) + '...';
        }
        ui.getInputFromUser('Personal Access Token',
            {
                initialValue: initValue
            },
            (err, value) => {
                if (err || value === initValue) {
                    return res();
                }
                settings.setSettingForKey(ACCESS_TOKEN_KEY, value);
                res();
            });
    });
}

function setOrganization() {
    return new Promise((res, _rej) => {
        ui.getInputFromUser('Organization',
            {
                initialValue: settings.settingForKey(ORGANIZATION)
            },
            (err, value) => {
                if (err) {
                    return res();
                }
                settings.setSettingForKey(ORGANIZATION, value);
                res();
            });
    });
}

async function setProjectIdFromExisting() {
    try {
        if (!settings.settingForKey(ORGANIZATION) || !settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
        }
        if (!dom.getSelectedDocument()) {
            throw 'Please select a document';
        }
        ui.message('Loading projects');
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

function test() {
    const selectedPage = dom.getSelectedDocument().selectedPage;
    const artBoards = dom.find('Artboard', selectedPage);
    const artBoard = artBoards[40];
    const buffer = dom.export(artBoard, {
        output: false
    });
    const artBoardImage = buffer.toString('base64');
    const container = {
        x: artBoard.frame.width,
        y: artBoard.frame.height
    };
    const textElements = dom.find('Text', artBoard).map(e => {
        const textId = e.id;
        const text = e.text;
        let parent = e.parent;
        let parentId = parent.id;
        let x = e.frame.x;
        let y = e.frame.y;
        while (parentId !== artBoard.id) {
            x += parent.frame.x;
            y += parent.frame.y;
            parent = parent.parent;
            parentId = parent.id;
        }
        return { x, y, textId, text };
    });
    let html = '<html>';
    html += '<body>';
    html += '<div style="position: relative;">';
    html += `<img style="width:${container.x}px;height:${container.y}px;" src="data:image/png;base64,${artBoardImage}">`;
    textElements.forEach(t => html += `<div id="${t.textId}" style="position: absolute;top:${t.y}px;left:${t.x}px;">${t.text}</div>`);
    html += '</div>';
    html += '</body>';
    html += '</html>';
    console.log(html);
    ui.message('Test func');
}

export { connectToCrowdin, setProjectIdFromExisting, test };
