async function fetchAllStrings(projectId, sourceStringsApi, offset) {
    offset = !offset ? 0 : offset;
    const limit = 500;
    const maxAmount = 4000;
    const res = await sourceStringsApi.listProjectStrings(projectId, null, limit, offset);
    if ((res.data && res.data.length < limit) || offset > maxAmount) {
        return __convertCrowdinStringsToStrings(res.data);
    } else {
        const result = await fetchAllStrings(projectId, sourceStringsApi, offset + limit);
        const resStrings = __convertCrowdinStringsToStrings(res.data);
        return [...resStrings, ...result];
    }
}

function __convertCrowdinStringsToStrings(crowdinStrings) {
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
                text, id: e.id
            }
        })
        .filter(e => e.text && e.text.length > 0);
}

export { fetchAllStrings };