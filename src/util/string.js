
const maxLength = 50;

function truncateLongText(str) {
    const lines = (str || '').split('\n');
    let result = lines[0];
    if (result.length > maxLength) {
        result = result.substring(0, maxLength - 3) + '...';
    } else if (lines.length > 1) {
        result = result + '...';
    }
    return result;
}

export { truncateLongText };