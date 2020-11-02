import {
    dividerCell, emailBody, row, textCell,
    footerRow, greeting, headerRow, paragraph, signatureCell, makeEmailSrc
} from 'blob-common/core/email';

const dividerSrc = makeEmailSrc('public/img/invite_divider.png');
const baseUrl = process.env.frontend || process.env.devFrontend || 'https://localhost:3000';

export const statsMailText = ({toName}) => {
    return `Hi ${toName}, Er zijn stats, maar je kunt ze zonder html niet bekijken`;
};

export const statsMailBody = ({ toName, statsTable }) => {

    return emailBody([
        headerRow(makeEmailSrc('public/img/logo_email_1.png'), baseUrl),
        row([
            textCell(greeting(`Hi ${toName},`)),
            textCell(paragraph(`Er zijn weer stats beschikbaar van ${process.env.stage.toUpperCase()}. De meest actieve leden hieronder`)),
            textCell(statsTable),
            dividerCell(dividerSrc),
        ]),
        row([
            textCell(paragraph('We zien je graag terug op clubalmanac')),
            signatureCell(makeEmailSrc('public/img/signature_wouter.png'))
        ]),
        footerRow
    ]);
};