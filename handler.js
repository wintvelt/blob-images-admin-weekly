import { handler } from 'blob-common/core/handler';
import { dbUpdate, dynamoDb } from 'blob-common/core/db';
import { ses } from 'blob-common/core/ses';
import { getTopTen } from './helpers';
import { makeTable } from './htmlTable';
import { statsMailBody, statsMailText } from './statsMail';

export const main = handler(async (event, context) => {
    // get photoStats from all users
    const photoStatsData = await dynamoDb.query({
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: { '#PK': 'PK' },
        ExpressionAttributeValues: { ':PK': 'UPstats' }
    });
    const photoStats = photoStatsData.Items || [];
    const topTenStats = getTopTen(photoStats);

    // enrich stats data
    const usersData = await Promise.all(
        topTenStats.map(stat => dynamoDb.get({
            Key: {
                PK: 'USER',
                SK: stat.SK
            }
        }))
    );
    // create table with username, photoCount, diff (sorted by diff descending)
    const enrichedStats = topTenStats.map((stat, i) => ({
        ...stat,
        userName: usersData[i].Item?.name
    }));

    // update prevStats for all users
    await Promise.all(photoStats.map(stat => {
        return dbUpdate(stat.PK, stat.SK, 'prevPhotoCount', stat.photoCount);
    }));

    // if there is are no stats, do not send a mail
    if (enrichedStats.length === 0) {
        console.log('no stats to send');
        return { message: 'no stats' };
    }

    // create statsTable for all users
    const statsTableText = makeTable({
        arr: enrichedStats,
        columns: [
            { label: 'Naam', key: 'userName' },
            { label: 'Nieuwe pics', key: 'diff', right: true },
            { label: 'Total pics', key: 'photoCount', right: true },
        ]
    });

    const toName = 'Vaatje';
    const stage = process.env.stage || 'unknown';
    console.log(`mailed from branch: ${stage}`);
    // send Email
    await ses.sendEmail({
        toEmail: process.env.webmaster,
        fromEmail: `clubalmanac ${stage.toUpperCase()} <wouter@clubalmanac.com>`,
        subject: `Stats van clubalmanac`,
        data: statsMailBody({ toName, statsTable: statsTableText }),
        textData: statsMailText({ toName }),
    });

    console.log({ message: `weekly mail sent with`, statsTableText });
    return { message: `weekly mail sent` };
});