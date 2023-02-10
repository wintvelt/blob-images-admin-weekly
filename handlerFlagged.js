// handler for cron job to process flagged photos and inform owners
/*
    retrieve flagged photos
    make user dict, user should get mail if:
    - any new flagged photos: flagdate === yesterday AND not appealDate
    - any photos to be deleted today: = flaggedDeleteDate === today
    mail to the user contains:
    - each photo flagged yesterday
    - x photos deleted
    - remaining total y photos flagged
    - you appealed on z flagged photos

    mail to admin contains:
    - x new flagged photos

    Nice to have/ TODO
    - deeplink to flagged photos in my account
*/
import { handler } from 'blob-common/core/handler';
import { dynamoDb, dbUpdateMulti } from 'blob-common/core/db';
import { diffDate, now } from 'blob-common/core/date';
import { ses } from 'blob-common/core/ses';
import { statsMailBody, statsMailText } from './statsMail';
import { flaggedAdminMailBody, flaggedAdminMailText, flaggedUserMailBody, flaggedUserMailText } from './flaggedMail';

const MAILFREQ = 1; // days

export const main = handler(async (event, context) => {
    const today = now();
    const yesterday = diffDate(today, -MAILFREQ); // works only if 1 day
    // get all flagged photos
    const result = await dynamoDb.query({
        IndexName: process.env.flaggedIndex,
        KeyConditionExpression: "#f = :f",
        ExpressionAttributeNames: {
            '#f': 'flagged',
        },
        ExpressionAttributeValues: {
            ":f": 'flagged',
        },
    });
    const flaggedPhotos = result.Items || [];
    if (flaggedPhotos.length === 0) return { message: `there were no new flagged photos on ${yesterday}` }

    // ROUND 1 promises
    let round1Promises = [];

    // build a dict with user as key
    let userDict = {};
    for (let i = 0; i < flaggedPhotos.length; i++) {
        const photo = flaggedPhotos[i];
        const { flaggedDate, flaggedAppealDate, flaggedDeleteDate } = photo;
        const userId = photo.SK;
        const userRecord = userDict[userId] || {};
        const { flaggedCount, appealedCount, deleteCount, shouldReceiveMail, newFlagged = [] } = userRecord;
        const isNewFlagged = (flaggedDate === yesterday);
        const newNewFlagged = (isNewFlagged) ? [...newFlagged, photo] : newFlagged;
        const isDeletable = (flaggedDeleteDate === today);
        if (isDeletable) {
            // add get user stats to the promises list
            round1Promises.push(dynamoDb.get({
                Key: {
                    PK: 'UPstats',
                    SK: userId,
                }
            }));
            // add deletable items to the promises list
            round1Promises.push(dynamoDb.delete({
                Key: {
                    PK: photo.PK,
                    SK: userId,
                },
                ReturnValues: "NONE"
            }));
        };
        const newFlaggedCount = (flaggedCount || 0) + (isDeletable ? 0 : 1);
        const newDeleteCount = (deleteCount || 0) + (isDeletable ? 1 : 0);
        const newAppealedCount = (appealedCount || 0) + ((flaggedAppealDate && !isDeletable) ? 1 : 0);
        const newShouldReceiveEmail = (shouldReceiveMail) || (isNewFlagged && !flaggedAppealDate);
        const newUserRecord = {
            userId, // store userId in value too
            deleteCount: newDeleteCount,
            flaggedCount: newFlaggedCount,
            appealedCount: newAppealedCount,
            shouldReceiveMail: newShouldReceiveEmail,
            newFlagged: newNewFlagged
        };
        userDict[userId] = newUserRecord;
    };
    // get all the users with flagged stuff, for mail + webmaster info
    Object.keys(userDict).forEach(userId => {
        round1Promises.push(dynamoDb.get({
            Key: {
                PK: 'USER',
                SK: userId
            }
        }));
    });

    // run promises ROUND 1
    const round1Results = await Promise.all(round1Promises);
    const round1Items = round1Results.filter(res => !!res.Item).map(res => res.Item).filter(item => !!item.PK);

    // add info to the usersDict
    for (let i = 0; i < round1Items.length; i++) {
        const item = round1Items[i];
        if (item.PK === 'USER') {
            // add name and email to the userDict
            userDict[item.SK].name = item.name;
            userDict[item.SK].email = item.email;
        } else {
            // add stats to userDict
            userDict[item.SK].prevDeletedFlagged = item.deletedFlagged || 0;
        }
    };

    // ROUND 2 promises
    let round2Promises = [];
    // add the emails to users to the promises list
    const usersToMail = Object.values(userDict).filter(user => user.shouldReceiveMail);
    for (let i = 0; i < usersToMail.length; i++) {
        const user = usersToMail[i];
        const { name, email, newFlagged, flaggedCount, deleteCount, appealedCount } = user;
        // TODO: create grid for new flagged photos
        const newFlaggedCount = newFlagged ? newFlagged.length : 0;
        round2Promises.push(ses.sendEmail({
            toEmail: email,
            fromEmail: `clubalmanac ${stage.toUpperCase()} <wouter@clubalmanac.com>`,
            subject: `clubalmanac meldingen over ongepaste inhoud van jouw foto's`,
            data: flaggedUserMailBody({ name, flaggedCount, appealedCount, deleteCount, newFlaggedCount }),
            textData: flaggedUserMailText({ name }),
        }));
    };

    // for each user with deleted photos, add a stat update to a new promise list
    const statsToUpdate = Object.values(userDict).filter(user => (user.deleteCount > 0));
    for (let i = 0; i < statsToUpdate.length; i++) {
        const user = statsToUpdate[i];
        round2Promises.push(dbUpdateMulti('UPstats', user.SK, {
            deletedFlagged: (user.prevDeletedFlagged || 0) + user.deleteCount
        }));
    };

    // add email to webmaster with stats to promises list
    const adminTableText = makeTable({
        arr: Object.values(userDict),
        columns: [
            { label: 'Naam', key: 'name' },
            { label: 'Verwijderd', key: 'deleteCount' },
            { label: 'Gemeld', key: 'flaggedCount' },
            { label: 'Bezwaar', key: 'appealedCount' }
        ]
    });
    round2Promises.push(ses.sendEmail({
        toEmail: process.env.webmaster,
        fromEmail: `clubalmanac ${stage.toUpperCase()} <wouter@clubalmanac.com>`,
        subject: `clubalmanac ${stage.toUpperCase()} update over ongepaste inhoud`,
        data: flaggedAdminMailBody({ name: 'Vaatje', adminTableText }),
        textData: flaggedAdminMailText(),
    }))

    // run promises ROUND 2
    await Promise.all(round2Promises);

    return { message: `daily batch job on flagged photos done` };
});