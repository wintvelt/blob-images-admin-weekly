import { handler } from 'blob-common/core/handler';
import { dynamoDb } from 'blob-common/core/db';
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
    const enrichedStats = photoStats.map((stat, i) => ({
        ...stat,
        userName: usersData[i].Item?.name
    }));

    // update prevStats for all users

    // create statsTable for all users
    const statsTableText = makeTable({
        arr: enrichedStats,
        columns: [
            { label: 'Naam', key: 'userName' },
            { label: 'Nieuwe pics', key: 'diff' },
            { label: 'Total pics', key: 'photoCount' },
        ]
    });

    const toName = 'Vaatje';

    await ses.sendEmail({
        toEmail: process.env.webmaster,
        fromEmail: 'clubalmanac <wouter@clubalmanac.com>',
        subject: `Stats van clubalmanac`,
        data: statsMailBody({ toName, statsTable: statsTableText }),
        textData: statsMailText({ toName }),
    });

    // send Email
    return { message: `weekly mail sent (almost)` };
});