import dom from 'sketch/dom';
import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as httpUtil from '../util/http';
import { getSelectedArtboard } from '../util/dom';
import { getTextElementsInArtboard } from '../util/html';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import { fetchAllStrings } from '../util/client';

async function uploadScreenshots() {
    try {
        const artboard = getSelectedArtboard(dom.getSelectedDocument().selectedPage);
        const texts = getTextElementsInArtboard(artboard);
        const b = dom.export(artboard, {
            output: false,
            formats: 'png'
        });
        const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
        const { screenshotsApi, uploadStorageApi, sourceStringsApi } = httpUtil.createClient();
        const screenshotName = `Sketch_Artboard_${artboard.id}.png`;
        //TODO create or get and update screenshot
        const storageRecord = await uploadStorageApi.addStorage(screenshotName, b.slice(b.byteOffset, b.byteOffset + b.byteLength));
        const screenshot = await screenshotsApi.addScreenshot(projectId, {
            storageId: storageRecord.data.id,
            name: `Sketch_Artboard_${artboard.id}`
        });

        const allStrings = await fetchAllStrings(projectId, sourceStringsApi);

        //TODO update tags positions, remove tags which are removed from design, add new tags
        const tags = texts
            .filter(t => !!allStrings.find(st => st.text === t.text))
            .map(t => {
                return {
                    stringId: allStrings.find(st => st.text === t.text).id,
                    position: {
                        x: t.x,
                        y: t.y,
                        width: t.e.frame.width,
                        height: t.e.frame.height
                    }
                };
            });

        const res = await screenshotsApi.addTag(projectId, screenshot.data.id, tags);
        console.log(JSON.stringify(res));
        ui.message('Uploaded');
    } catch (error) {
        console.log(JSON.stringify(error));
        httpUtil.handleError(error);
    }
}

export { uploadScreenshots };