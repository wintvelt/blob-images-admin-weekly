import {
    dividerCell, emailBody, row, textCell,
    footerRow, greeting, headerRow, paragraph, signatureCell, makeEmailSrc
} from 'blob-common/core/email';

const dividerSrc = makeEmailSrc('public/img/invite_divider.png');
const baseUrl = process.env.frontend || process.env.devFrontend || 'https://localhost:3000';

export const flaggedUserMailText = ({ name }) => {
    return `Hi ${name}, Er zijn meldingen over ongepaste inhoud van jouw foto's, check de app voor details`;
};

export const flaggedUserMailBody = ({ name, flaggedCount, appealedCount, deleteCount, newFlaggedCount }) => {
    return emailBody([
        headerRow(makeEmailSrc('public/img/logo_email_1.png'), baseUrl),
        row([
            textCell(greeting(`Hi ${name},`)),
            textCell(paragraph(`Er zijn meldingen dat sommige van jouw foto's ongepaste inhoud hebben. Hieronder een korte update`)),
            dividerCell(dividerSrc),
            (newFlaggedCount > 0) ? textCell(paragraph(`Gisteren ${newFlaggedCount === 1 ? 'is' : "zijn"} ${newFlaggedCount} van jouw foto's gemeld als ongepast qua inhoud.`)) : '',
            (deleteCount > 0) ? textCell(paragraph(`${deleteCount} eerder gemelde foto${deleteCount === 1 ? ' van jou is' : "'s van jou zijn"} vandaag verwijderd van clubalmanac.`)) : '',
            textCell(paragraph(`${flaggedCount} foto${flaggedCount === 1 ? ' is' : "'s zijn"} eerder gemeld en nog in behandeling.`)),
            textCell(paragraph(`Bij ${appealedCount} van deze foto${flaggedCount === 1 ? '' : "'s"} heb je bezwaar gemaakt tegen verwijdering. Raadpleeg je profiel in de app voor de actuele status.`)),
            dividerCell(dividerSrc),
        ]),
        row([
            textCell(paragraph('We zien je graag terug op clubalmanac')),
            signatureCell(makeEmailSrc('public/img/signature_wouter.png'))
        ]),
        footerRow
    ]);
};

export const flaggedAdminMailText = () => {
    return `Hi Master, Er zijn meldingen over ongepaste inhoud van gebruikersfoto's, check de app voor details`;
};

export const flaggedAdminMailBody = ({ name, adminTableText }) => {
    return emailBody([
        headerRow(makeEmailSrc('public/img/logo_email_1.png'), baseUrl),
        row([
            textCell(greeting(`Hi ${name},`)),
            textCell(paragraph(`Er is weer een update over ongepaste inhoud. Hieronder details`)),
            textCell(adminTableText),
            dividerCell(dividerSrc),
        ]),
        row([
            textCell(paragraph('We zien je graag terug op clubalmanac')),
            signatureCell(makeEmailSrc('public/img/signature_wouter.png'))
        ]),
        footerRow
    ]);
};