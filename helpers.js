const addDiff = (stats) => (
    stats.map(stat => ({
        ...stat,
        diff: stat.photoCount - (stat.prevPhotoCount || 0)
    }))
);

const sortByDiff = (a, b) => (
    (a.diff > b.diff) ? -1
        : (a.diff < b.diff) ? 1
            : (a.photoCount > b.photoCount) ? -1
                : (a.photoCount < b.photoCount) ? 1
                    : 0
);

export const getTopTen = (stats) => {
    let withDiff = addDiff(stats);
    const sortedWithDiff = withDiff.sort(sortByDiff);
    const topTen = sortedWithDiff.slice(0, 10);
    if (topTen[0].diff === 0) return [];
    return topTen;
};