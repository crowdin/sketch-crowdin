import dom from 'sketch/dom';
import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { getTextElementsInArtboard, getSelectedArtboards } from '../util/dom';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import { fetchStrings } from '../util/client';
import { default as displayTexts } from '../../assets/texts.json';
import { truncateLongText } from '../util/string';

async function uploadScreenshots(stringIds, avoidSelectedArtboards) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedPage) {
            throw displayTexts.notifications.warning.selectPage;
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw displayTexts.notifications.warning.noAccessToken;
        }
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }

        const selectedArtboards = getSelectedArtboards(selectedPage)

        if(!avoidSelectedArtboards && selectedArtboards.length === 0) {
            throw displayTexts.notifications.warning.pleaseSelectArtboards; 
        }

        let tags = localStorage.getTags(selectedDocument);
        const artboards = dom.find('Artboard', selectedPage);
        const allTexts = dom.find('Text', selectedPage);

        //removing obsolete tags
        const { screenshotsApi } = httpUtil.createClient();
        const strings = await fetchStrings(projectId);
        const stringsIds = strings.map(st => st.id)

        const screenshotsBefore = [];
        tags
            .filter(t => !!t.artboardId)
            .map(t => __buildScreenshotName(t.artboardId, t.pageId))
            .filter(id => !screenshotsBefore.includes(id))
            .forEach(id => screenshotsBefore.push(id));

        tags = tags.filter(t => stringsIds.includes(t.stringId));

        const artboardsTexts = avoidSelectedArtboards ? artboards.map(e => {
            return {
                artboard: e,
                texts: getTextElementsInArtboard(e)
            }
        }): selectedArtboards.map(e => {
            return {
                artboard: e,
                texts: getTextElementsInArtboard(e)
            }
        })
        const tempTags = [];
        const workingArtboards = !!stringIds
            ? tags.filter(t => stringIds.includes(t.stringId)).map(t => t.artboardId)
            : [];
        tags = tags.filter(e => {
            if (e.pageId !== selectedPage.id) {
                return !!selectedDocument.pages.find(p => p.id === e.pageId);
            }
            if (!e.artboardId) {
                return !!allTexts.find(t => t.id === e.id);
            }
            const artboardText = artboardsTexts.find(e2 => e2.artboard.id === e.artboardId);
            if (!!artboardText) {
                const foundText = artboardText.texts.find(t => t.textId === e.id && t.type === e.type);
                if (!!foundText) {
                    if (!stringsIds || stringsIds.includes(e.stringId) || workingArtboards.includes(e.artboardId)) {
                        tempTags.push({
                            ...e,
                            textElement: foundText
                        });
                    }
                }
                return !!foundText;
            }
            return false;
        });

        if (!tempTags.length) {
            throw displayTexts.notifications.warning.noLinkedStrings; 
        }

        const groupedTags = tempTags.reduce((accumulator, tag) => {
            if (!accumulator[`artboard_${tag.artboardId}`]) {
                accumulator[`artboard_${tag.artboardId}`] = {
                    artboard: artboards.find(a => a.id === tag.artboardId),
                    tags: [tag]
                };
            } else {
                accumulator[`artboard_${tag.artboardId}`].tags.push(tag);
            }
            return accumulator;
        }, {});

        const screenshots = await screenshotsApi.withFetchAll().listScreenshots(projectId);

        const screenshotsAfter = [];
        tags
            .filter(t => !!t.artboardId)
            .map(t => __buildScreenshotName(t.artboardId, t.pageId))
            .filter(id => !screenshotsAfter.includes(id))
            .forEach(id => screenshotsAfter.push(id));

        //removing obsolete screenshots
        const promises = screenshotsBefore
            .filter(id => !screenshotsAfter.includes(id))
            .map(async screenshotName => {
                const screenshot = screenshots.data.find(sc => sc.data.name === screenshotName);
                if (!!screenshot) {
                    ui.message(displayTexts.notifications.info.removingNotValidScreenshot.replace('%name%', truncateLongText(screenshot.data.name)));
                    await screenshotsApi.deleteScreenshot(projectId, screenshot.data.id);
                }
            })

        for (let key in groupedTags) {
            if (groupedTags.hasOwnProperty(key)) {
                promises.push(sendTagsGroup(groupedTags[key], selectedPage, projectId, screenshots));
            }
        }

        await Promise.all(promises);

        localStorage.saveTags(selectedDocument, tags);
        ui.message(displayTexts.notifications.info.screenshotsUploadedToCrowdin);
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function sendTagsGroup(tagsGroup, page, projectId, screenshots) {
    const artboard = tagsGroup.artboard;
    const tags = tagsGroup.tags;
    const b = dom.export(artboard, {
        output: false,
        formats: 'png'
    });
    ui.message(displayTexts.notifications.info.screenshotUploadingToCrowdin.replace('%name%', truncateLongText(artboard.name)));
    const { screenshotsApi, uploadStorageApi } = httpUtil.createClient();
    const screenshotName = __buildScreenshotName(artboard.id, page.id);
    const screenshotNameWithExtension = `${screenshotName}.png`;
    const storageRecord = await uploadStorageApi.addStorage(screenshotNameWithExtension, b.slice(b.byteOffset, b.byteOffset + b.byteLength));

    let screenshot = screenshots.data.find(sc => sc.data.name === screenshotNameWithExtension);

    if (!screenshot) {
        screenshot = await screenshotsApi.addScreenshot(projectId, {
            storageId: storageRecord.data.id,
            name: screenshotNameWithExtension
        });
    } else {
        screenshot = await screenshotsApi.updateScreenshot(projectId, screenshot.data.id, {
            storageId: storageRecord.data.id,
            name: screenshotNameWithExtension
        });
    }
    const screenshotId = screenshot.data.id;

    ui.message(displayTexts.notifications.info.addingTagsToScreenshot.replace('%name%', truncateLongText(artboard.name)));
    await screenshotsApi.clearTags(projectId, screenshotId);

    const tagsRequest = tags.map(tag => {
        return {
            stringId: tag.stringId,
            position: {
                x: parseInt(tag.textElement.x),
                y: parseInt(tag.textElement.y),
                width: parseInt(tag.textElement.frame.width),
                height: parseInt(tag.textElement.frame.height)
            }
        };
    });

    await screenshotsApi.addTag(projectId, screenshotId, tagsRequest);
    ui.message(displayTexts.notifications.info.screenshotUploadedToCrowdin.replace('%name%', truncateLongText(artboard.name)));
}

function __buildScreenshotName(artboardId, pageId) {
    return `Sketch_${pageId}_Artboard_${artboardId}`;
}

export { uploadScreenshots };